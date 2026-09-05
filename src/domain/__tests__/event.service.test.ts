import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/event/repository', () => ({
  listEvents: vi.fn(), findEventById: vi.fn(), findEventBySlug: vi.fn(),
  createEvent: vi.fn(), updateEvent: vi.fn(), archiveEvent: vi.fn(),
  clearHighlightsExcept: vi.fn(), slugExists: vi.fn(),
  register: vi.fn(), cancelRegistration: vi.fn(),
}));
vi.mock('@/server/cache', () => ({
  invalidate: vi.fn(),
  tags: { event: (id: string) => `event:${id}`, events: () => 'events' },
}));
vi.mock('@/domain/audit/service', () => ({ record: vi.fn() }));

import * as repo from '@/domain/event/repository';
import * as audit from '@/domain/audit/service';
import * as service from '@/domain/event/service';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };
const organiser: Actor = { kind: 'user', name: null, id: 'o1', email: 'o@e.com', role: 'USER', canCreateEvents: true };
const admin: Actor = { kind: 'user', name: null, id: 'a1', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000);

const rec = (over: Record<string, unknown> = {}) => ({
  id: 'e1', slug: 'annual-gathering', title: 'Annual gathering', description: null,
  startsAt: FUTURE, endsAt: null, timezone: 'Asia/Kolkata', mode: 'IN_PERSON',
  venue: 'ISKCON Juhu', city: 'Mumbai', countryCode: 'IN', onlineUrl: null,
  capacity: null, status: 'PUBLISHED', isHighlighted: false,
  createdAt: new Date('2026-01-01'), createdById: 'o1',
  _count: { registrations: 0 }, ...over,
});

const valid = {
  title: 'Gathering', startsAt: FUTURE.toISOString(), timezone: 'Asia/Kolkata',
  mode: 'IN_PERSON', venue: 'Juhu',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.slugExists).mockResolvedValue(false);
});

describe('timezone handling', () => {
  it('rejects a timezone that is not an IANA zone', async () => {
    const result = await service.createEvent(admin, { ...valid, timezone: 'IST' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
  });

  it('accepts a real IANA zone and stores the instant in UTC', async () => {
    vi.mocked(repo.createEvent).mockResolvedValue(rec() as never);
    const result = await service.createEvent(admin, valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.timezone).toBe('Asia/Kolkata');
      expect(result.value.startsAt).toBe(FUTURE.toISOString());
    }
  });

  it('rejects an end time before the start', async () => {
    const result = await service.createEvent(admin, {
      ...valid,
      endsAt: new Date(FUTURE.getTime() - 3600_000).toISOString(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fields?.endsAt).toBeDefined();
  });

  it('requires a joining link for an online event', async () => {
    const result = await service.createEvent(admin, { ...valid, mode: 'ONLINE' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fields?.onlineUrl).toBeDefined();
  });
});

describe('listing', () => {
  it('hides unpublished events from the public and shows them to reviewers', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([]);
    await service.listEvents(anon);
    expect(vi.mocked(repo.listEvents).mock.calls[0]![0]!.includeUnpublished).toBe(false);

    await service.listEvents(admin);
    expect(vi.mocked(repo.listEvents).mock.calls[1]![0]!.includeUnpublished).toBe(true);
  });

  it('does not leak the creator id', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([rec() as never]);
    const result = await service.listEvents(anon);
    if (result.ok) expect('createdById' in result.value[0]!).toBe(false);
  });

  it('reports capacity as spaces left', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([
      rec({ capacity: 50, _count: { registrations: 12 } }) as never,
    ]);
    const result = await service.listEvents(anon);
    if (result.ok) {
      expect(result.value[0]!.registeredCount).toBe(12);
      expect(result.value[0]!.spacesLeft).toBe(38);
    }
  });

  it('reports no limit as null spaces left, not zero', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([rec({ capacity: null }) as never]);
    const result = await service.listEvents(anon);
    if (result.ok) expect(result.value[0]!.spacesLeft).toBeNull();
  });
});

describe('ownership', () => {
  it('stops an organiser editing or deleting someone else’s event', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ createdById: 'other' }) as never);
    expect((await service.updateEvent(organiser, 'e1', { title: 'New' })).ok).toBe(false);
    expect((await service.deleteEvent(organiser, 'e1')).ok).toBe(false);
    expect(repo.archiveEvent).not.toHaveBeenCalled();
  });

  it('lets an admin manage any event, and audits the cancellation', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ createdById: 'other' }) as never);
    expect((await service.deleteEvent(admin, 'e1')).ok).toBe(true);
    expect(repo.archiveEvent).toHaveBeenCalledWith('e1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event.cancel', entity: 'Event', entityId: 'e1' }),
    );
  });

  it('refuses a member without the permission', async () => {
    const result = await service.createEvent(member, valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });
});

describe('registration', () => {
  beforeEach(() => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec() as never);
  });

  it('requires a signed-in member', async () => {
    const result = await service.registerForEvent(anon, 'e1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Unauthenticated');
  });

  it('registers, and waitlists once capacity is reached', async () => {
    vi.mocked(repo.register).mockResolvedValue('REGISTERED');
    const first = await service.registerForEvent(member, 'e1');
    if (first.ok) expect(first.value.status).toBe('REGISTERED');

    vi.mocked(repo.register).mockResolvedValue('WAITLISTED');
    const later = await service.registerForEvent(member, 'e1');
    if (later.ok) expect(later.value.status).toBe('WAITLISTED');
  });

  it('reports a double registration as a conflict', async () => {
    vi.mocked(repo.register).mockResolvedValue('ALREADY');
    const result = await service.registerForEvent(member, 'e1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Conflict');
  });

  it('refuses registration for an event that has already happened', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(
      rec({ startsAt: new Date('2020-01-01') }) as never,
    );
    const result = await service.registerForEvent(member, 'e1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Conflict');
    expect(repo.register).not.toHaveBeenCalled();
  });

  it('refuses registration for an unpublished event', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ status: 'DRAFT' }) as never);
    expect((await service.registerForEvent(member, 'e1')).ok).toBe(false);
  });
});

describe('getEvent', () => {
  it('resolves by slug first, then by id', async () => {
    vi.mocked(repo.findEventBySlug).mockResolvedValue(rec() as never);
    expect((await service.getEvent(anon, 'annual-gathering')).ok).toBe(true);
    expect(repo.findEventById).not.toHaveBeenCalled();
  });

  it('hides an unpublished event behind NotFound', async () => {
    vi.mocked(repo.findEventBySlug).mockResolvedValue(null);
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ status: 'DRAFT' }) as never);
    const result = await service.getEvent(anon, 'e1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});

describe('updating an event', () => {
  beforeEach(() => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec() as never);
    vi.mocked(repo.updateEvent).mockResolvedValue(rec() as never);
  });

  it('applies only the fields that were sent', async () => {
    await service.updateEvent(admin, 'e1', { title: 'Renamed' });
    expect(vi.mocked(repo.updateEvent).mock.calls[0]![1]).toEqual({ title: 'Renamed' });
  });

  it('clears other highlights when one is promoted', async () => {
    await service.updateEvent(admin, 'e1', { isHighlighted: true });
    expect(repo.clearHighlightsExcept).toHaveBeenCalledWith('e1');
  });

  it('records the timezone change in the audit trail', async () => {
    await service.updateEvent(admin, 'e1', { timezone: 'Europe/London' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event.update', entity: 'Event' }),
    );
  });

  it('rejects an invalid timezone on update too', async () => {
    const result = await service.updateEvent(admin, 'e1', { timezone: 'EST' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
  });

  it('answers NotFound for an event that does not exist', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(null);
    const result = await service.updateEvent(admin, 'gone', { title: 'x' });
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});

describe('cancelling a registration', () => {
  it('requires a signed-in member', async () => {
    const result = await service.cancelRegistration(anon, 'e1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Unauthenticated');
  });

  it('cancels for the caller only, never for someone else', async () => {
    expect((await service.cancelRegistration(member, 'e1')).ok).toBe(true);
    expect(repo.cancelRegistration).toHaveBeenCalledWith('e1', 'u1');
  });
});
