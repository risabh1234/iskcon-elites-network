import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/leadership/repository', () => ({
  listProfiles: vi.fn(), findById: vi.fn(), findBySlug: vi.fn(),
  create: vi.fn(), update: vi.fn(), setPortrait: vi.fn(),
  addMedia: vi.fn(), findMedia: vi.fn(), archiveMedia: vi.fn(),
  slugExists: vi.fn(),
}));
vi.mock('@/server/cache', () => ({
  invalidate: vi.fn(),
  tags: { leadership: () => 'leadership' },
}));
vi.mock('@/domain/audit/service', () => ({ record: vi.fn() }));

import * as repo from '@/domain/leadership/repository';
import * as audit from '@/domain/audit/service';
import * as service from '@/domain/leadership/service';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };
const admin: Actor = { kind: 'user', name: null, id: 'a1', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };

const asset = (over = {}) => ({
  id: 'as1', key: 'documents/x.pdf', bucket: 'profiles', mime: 'application/pdf', bytes: 2048, ...over,
});

const record = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  slug: 'tukaram-das',
  honorific: 'His Grace',
  name: 'Tukaram Das',
  initiatedName: null,
  role: 'Vice President, ISKCON Bhubaneswar',
  headline: 'Travelling monk and preacher',
  bio: 'First paragraph.\n\nSecond paragraph.',
  focusAreas: 'Jagannātha-kathā\n\n  Gauḍīya Vaiṣṇava siddhānta  \n',
  initiatives: 'Library and Study Centre',
  status: 'PUBLISHED',
  orderIndex: 0,
  portraitAlt: 'Standing before the harbour',
  portraitAsset: { id: 'p1', key: 'profiles/p.jpg', bucket: 'profiles' },
  media: [
    { id: 'm1', kind: 'PHOTO', title: 'At the temple', description: null, orderIndex: 0, createdAt: new Date('2026-03-01'), asset: asset({ id: 'as2', key: 'profiles/a.jpg', mime: 'image/jpeg' }) },
    { id: 'm2', kind: 'DOCUMENT', title: 'Seminar handout', description: 'Ten pages', orderIndex: 0, createdAt: new Date('2026-03-02'), asset: asset() },
  ],
  updatedAt: new Date('2026-03-03'),
  ...over,
});

const valid = {
  name: 'Tukaram Das',
  bio: 'A paragraph.',
  status: 'PUBLISHED',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.slugExists).mockResolvedValue(false);
});

describe('listLeadership', () => {
  it('asks for published profiles only when the reader is not a reviewer', async () => {
    vi.mocked(repo.listProfiles).mockResolvedValue([]);
    await service.listLeadership(anon);
    expect(repo.listProfiles).toHaveBeenCalledWith({ includeUnpublished: false });

    await service.listLeadership(member);
    expect(repo.listProfiles).toHaveBeenLastCalledWith({ includeUnpublished: false });
  });

  it('includes drafts for a reviewer', async () => {
    vi.mocked(repo.listProfiles).mockResolvedValue([]);
    await service.listLeadership(admin);
    expect(repo.listProfiles).toHaveBeenCalledWith({ includeUnpublished: true });
  });

  it('splits prose and lists so no component has to parse text', async () => {
    vi.mocked(repo.listProfiles).mockResolvedValue([record() as never]);
    const result = await service.listLeadership(anon);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const profile = result.value[0]!;
    expect(profile.paragraphs).toEqual(['First paragraph.', 'Second paragraph.']);
    // Blank and whitespace-only lines are dropped rather than rendered as
    // empty list items.
    expect(profile.focusAreas).toEqual(['Jagannātha-kathā', 'Gauḍīya Vaiṣṇava siddhānta']);
    expect(profile.displayName).toBe('His Grace Tukaram Das');
  });

  it('separates photographs from documents', async () => {
    vi.mocked(repo.listProfiles).mockResolvedValue([record() as never]);
    const result = await service.listLeadership(anon);
    if (!result.ok) return;

    expect(result.value[0]!.photos.map((p) => p.id)).toEqual(['m1']);
    expect(result.value[0]!.documents.map((d) => d.id)).toEqual(['m2']);
  });

  it('never invents alt text from the name', async () => {
    vi.mocked(repo.listProfiles).mockResolvedValue([record({ portraitAlt: null }) as never]);
    const result = await service.listLeadership(anon);
    if (result.ok) expect(result.value[0]!.portraitAlt).toBeNull();
  });
});

describe('getLeadershipProfile', () => {
  it('hides an unpublished profile behind NotFound rather than Forbidden', async () => {
    // Telling a stranger that a draft exists is itself a disclosure.
    vi.mocked(repo.findBySlug).mockResolvedValue(record({ status: 'DRAFT' }) as never);
    const result = await service.getLeadershipProfile(anon, 'tukaram-das');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('shows a draft to a reviewer', async () => {
    vi.mocked(repo.findBySlug).mockResolvedValue(record({ status: 'DRAFT' }) as never);
    expect((await service.getLeadershipProfile(admin, 'tukaram-das')).ok).toBe(true);
  });

  it('falls back to the id when the segment is not a slug', async () => {
    vi.mocked(repo.findBySlug).mockResolvedValue(null);
    vi.mocked(repo.findById).mockResolvedValue(record() as never);
    expect((await service.getLeadershipProfile(admin, 'l1')).ok).toBe(true);
  });
});

describe('writes', () => {
  it('refuse an ordinary member, before touching the database', async () => {
    const attempts = [
      service.createLeadershipProfile(member, valid),
      service.updateLeadershipProfile(member, 'l1', valid),
      service.setLeadershipPortrait(member, 'l1', { assetId: null }),
      service.addLeadershipMedia(member, 'l1', 'as1', { kind: 'PHOTO', title: 'x' }),
      service.removeLeadershipMedia(member, 'm1'),
    ];

    for (const result of await Promise.all(attempts)) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    }

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.addMedia).not.toHaveBeenCalled();
    expect(repo.archiveMedia).not.toHaveBeenCalled();
  });

  it('refuse an anonymous caller as unauthenticated', async () => {
    const result = await service.updateLeadershipProfile(anon, 'l1', valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Unauthenticated');
  });
});

describe('createLeadershipProfile', () => {
  it('derives a slug that folds diacritics', async () => {
    vi.mocked(repo.create).mockResolvedValue(record() as never);
    await service.createLeadershipProfile(admin, { ...valid, name: 'Śrīvāsa Ṭhākura' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'srivasa-thakura' }),
    );
  });

  it('stores an omitted optional field as null rather than an empty string', async () => {
    vi.mocked(repo.create).mockResolvedValue(record() as never);
    await service.createLeadershipProfile(admin, { ...valid, honorific: '' });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ honorific: null }));
  });

  it('rejects a profile with no biography, naming the field', async () => {
    const result = await service.createLeadershipProfile(admin, { name: 'X', status: 'DRAFT' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Validation');
      expect(result.error.fields?.bio).toBeDefined();
    }
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('updateLeadershipProfile', () => {
  it('audits the change without copying the whole biography into the log', async () => {
    vi.mocked(repo.findById).mockResolvedValue(record() as never);
    vi.mocked(repo.update).mockResolvedValue(record() as never);

    await service.updateLeadershipProfile(admin, 'l1', valid);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'leadership.update', entity: 'LeadershipProfile' }),
    );
    const entry = vi.mocked(audit.record).mock.calls[0]![0] as { after: { bioLength: number } };
    expect(entry.after.bioLength).toBe(record().bio.length);
    // A length, never the prose: a diff of 20,000 characters per edit answers
    // no question the trail exists to answer.
    expect(JSON.stringify(entry)).not.toContain('First paragraph.');
  });

  it('reports a missing profile as NotFound', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    const result = await service.updateLeadershipProfile(admin, 'nope', valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('turns a repository failure into Internal without leaking the cause', async () => {
    vi.mocked(repo.findById).mockResolvedValue(record() as never);
    vi.mocked(repo.update).mockRejectedValue(new Error('duplicate key value in "LeadershipProfile"'));

    const result = await service.updateLeadershipProfile(admin, 'l1', valid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Internal');
      expect(result.error.message).not.toContain('duplicate key');
    }
  });
});

describe('setLeadershipPortrait', () => {
  it('requires alt text whenever an image is attached', async () => {
    vi.mocked(repo.findById).mockResolvedValue(record() as never);
    const result = await service.setLeadershipPortrait(admin, 'l1', {
      assetId: '9f1a2c7e-4b3d-4c8a-9d61-0b7e5c2a1f30',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Validation');
      expect(result.error.fields?.alt).toBeDefined();
    }
    expect(repo.setPortrait).not.toHaveBeenCalled();
  });

  it('clears the alt text along with the portrait', async () => {
    vi.mocked(repo.findById).mockResolvedValue(record() as never);
    vi.mocked(repo.setPortrait).mockResolvedValue(record() as never);

    await service.setLeadershipPortrait(admin, 'l1', { assetId: null, alt: 'left over' });
    expect(repo.setPortrait).toHaveBeenCalledWith('l1', null, null);
  });
});

describe('leadership media', () => {
  it('requires a title, because it is the alt text and the link text', async () => {
    vi.mocked(repo.findById).mockResolvedValue(record() as never);
    const result = await service.addLeadershipMedia(admin, 'l1', 'as1', { kind: 'PHOTO' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fields?.title).toBeDefined();
    expect(repo.addMedia).not.toHaveBeenCalled();
  });

  it('archives rather than destroys, and records who did it', async () => {
    vi.mocked(repo.findMedia).mockResolvedValue({
      id: 'm1', profileId: 'l1', kind: 'DOCUMENT', title: 'Seminar handout',
      asset: { id: 'as1', key: 'documents/x.pdf' },
    } as never);

    const result = await service.removeLeadershipMedia(admin, 'm1');

    expect(result.ok).toBe(true);
    expect(repo.archiveMedia).toHaveBeenCalledWith('m1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'leadership.media.remove', actorId: 'a1' }),
    );
  });

  it('reports a missing file as NotFound', async () => {
    vi.mocked(repo.findMedia).mockResolvedValue(null);
    const result = await service.removeLeadershipMedia(admin, 'gone');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});
