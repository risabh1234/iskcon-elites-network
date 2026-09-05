import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/event/repository', () => ({
  listEvents: vi.fn(), findEventById: vi.fn(), createEvent: vi.fn(),
  updateEvent: vi.fn(), deleteEvent: vi.fn(), clearHighlightsExcept: vi.fn(),
}));
vi.mock('@/server/cache', () => ({
  invalidate: vi.fn(),
  tags: { event: (id: string) => `event:${id}`, events: () => 'events' },
}));

import * as repo from '@/domain/event/repository';
import * as service from '@/domain/event/service';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = { kind: 'user', id: 'u1', clerkId: 'c1', email: 'u@e.com', role: 'USER', canCreateEvents: false };
const organiser: Actor = { kind: 'user', id: 'o1', clerkId: 'c2', email: 'o@e.com', role: 'USER', canCreateEvents: true };
const admin: Actor = { kind: 'user', id: 'a1', clerkId: 'c3', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };

const rec = (over = {}) => ({
  id: 'e1', title: 'Annual gathering', location: 'Mumbai',
  date: new Date('2026-11-14T13:00:00Z'), time: '18:30', description: null,
  imageUrl: null, isHighlighted: false, isApproved: true,
  createdAt: new Date('2026-01-01'), addedById: 'o1', ...over,
});

const valid = { title: 'Gathering', location: 'Mumbai', date: '2026-11-14T13:00:00Z', time: '18:30' };

beforeEach(() => vi.clearAllMocks());

describe('listEvents', () => {
  it('hides unpublished events from the public', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([]);
    await service.listEvents(anon);
    expect(repo.listEvents).toHaveBeenCalledWith(false);
  });

  it('shows them to reviewers', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([]);
    await service.listEvents(admin);
    expect(repo.listEvents).toHaveBeenCalledWith(true);
  });

  it('does not leak the creator id', async () => {
    vi.mocked(repo.listEvents).mockResolvedValue([rec() as never]);
    const result = await service.listEvents(anon);
    if (result.ok) expect('addedById' in result.value[0]!).toBe(false);
  });
});

describe('createEvent', () => {
  it('refuses a member without the permission', async () => {
    const result = await service.createEvent(member, valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });

  it('allows an organiser', async () => {
    vi.mocked(repo.createEvent).mockResolvedValue(rec() as never);
    expect((await service.createEvent(organiser, valid)).ok).toBe(true);
  });

  it('rejects a malformed date', async () => {
    const result = await service.createEvent(organiser, { ...valid, date: 'not-a-date' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
  });

  it('clears other highlights when one is set', async () => {
    vi.mocked(repo.createEvent).mockResolvedValue(rec({ isHighlighted: true }) as never);
    await service.createEvent(admin, { ...valid, isHighlighted: true });
    expect(repo.clearHighlightsExcept).toHaveBeenCalledWith('e1');
  });
});

describe('update and delete respect ownership', () => {
  it('lets an organiser edit their own event', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ addedById: 'o1' }) as never);
    vi.mocked(repo.updateEvent).mockResolvedValue(rec() as never);
    expect((await service.updateEvent(organiser, 'e1', { title: 'New' })).ok).toBe(true);
  });

  it('stops an organiser editing someone else’s event', async () => {
    // `canCreateEvents` previously authorised editing and deleting every event.
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ addedById: 'other' }) as never);
    const result = await service.updateEvent(organiser, 'e1', { title: 'New' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });

  it('stops an organiser deleting someone else’s event', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ addedById: 'other' }) as never);
    expect((await service.deleteEvent(organiser, 'e1')).ok).toBe(false);
    expect(repo.deleteEvent).not.toHaveBeenCalled();
  });

  it('lets an admin manage any event', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(rec({ addedById: 'other' }) as never);
    vi.mocked(repo.deleteEvent).mockResolvedValue(undefined);
    expect((await service.deleteEvent(admin, 'e1')).ok).toBe(true);
  });

  it('answers NotFound for an unknown event', async () => {
    vi.mocked(repo.findEventById).mockResolvedValue(null);
    const result = await service.deleteEvent(admin, 'nope');
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});
