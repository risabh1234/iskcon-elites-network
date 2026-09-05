import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/member/repository', () => ({
  listMembers: vi.fn(),
  findMemberById: vi.fn(),
  createAlumnus: vi.fn(),
  createSpeaker: vi.fn(),
  updateAlumnus: vi.fn(),
  updateSpeaker: vi.fn(),
  setApproval: vi.fn(),
  deleteMember: vi.fn(),
}));
vi.mock('@/server/cache', () => ({
  invalidate: vi.fn(),
  tags: { member: (id: string) => `member:${id}`, members: () => 'members' },
}));

import * as repo from '@/domain/member/repository';
import * as service from '@/domain/member/service';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = {
  kind: 'user', name: null, id: 'u1', email: 'u@example.com',
  role: 'USER', canCreateEvents: false,
};
const admin: Actor = {
  kind: 'user', name: null, id: 'a1', email: 'a@example.com',
  role: 'ADMIN', canCreateEvents: true,
};

const record = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'm1', name: 'Śrīvāsa Ṭhākura', avatarUrl: null, bio: 'Bio',
  email: 'contact@example.com', isApproved: true, createdAt: new Date('2026-01-01'),
  addedById: 'u1', category: 'Medicine', cohort: '2018', ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('listMembers', () => {
  it('refuses to include unpublished entries for a non-reviewer', async () => {
    const result = await service.listMembers(member, { includeUnpublished: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(repo.listMembers).not.toHaveBeenCalled();
  });

  it('asks the repository for published entries only, for anonymous callers', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue([]);
    await service.listMembers(anon);
    expect(repo.listMembers).toHaveBeenCalledWith({ includeUnpublished: false, roleType: undefined });
  });

  it('includes unpublished entries for a reviewer', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue([]);
    await service.listMembers(admin, { includeUnpublished: true });
    expect(repo.listMembers).toHaveBeenCalledWith({ includeUnpublished: true, roleType: undefined });
  });

  it('withholds contact addresses from anonymous callers', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue([
      { record: record() as never, roleType: 'Alumni' },
    ]);
    const result = await service.listMembers(anon);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0]!.email).toBeUndefined();
  });

  it('shows contact addresses to signed-in members', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue([
      { record: record() as never, roleType: 'Alumni' },
    ]);
    const result = await service.listMembers(member);
    if (result.ok) expect(result.value[0]!.email).toBe('contact@example.com');
  });
});

describe('getMember', () => {
  it('answers NotFound — not Forbidden — for an unpublished entry', async () => {
    // Telling a stranger that a profile exists but is unreviewed is itself a
    // disclosure, so the two cases must be indistinguishable.
    vi.mocked(repo.findMemberById).mockResolvedValue({
      record: record({ isApproved: false, addedById: 'someone' }) as never,
      roleType: 'Alumni',
    });
    const result = await service.getMember(anon, 'm1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('lets a reviewer see an unpublished entry', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({
      record: record({ isApproved: false }) as never, roleType: 'Alumni',
    });
    expect((await service.getMember(admin, 'm1')).ok).toBe(true);
  });
});

describe('createMember', () => {
  const valid = { category: 'Alumni', fullName: 'A Name', cohort: '2019', bio: 'A bio' };

  it('rejects anonymous submissions', async () => {
    const result = await service.createMember(anon, valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });

  it('rejects an invalid payload with field-level detail', async () => {
    const result = await service.createMember(member, { category: 'Alumni', fullName: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Validation');
      expect(result.error.fields).toBeDefined();
    }
    expect(repo.createAlumnus).not.toHaveBeenCalled();
  });

  it('leaves an ordinary member’s submission unapproved', async () => {
    vi.mocked(repo.createAlumnus).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    await service.createMember(member, valid);
    expect(vi.mocked(repo.createAlumnus).mock.calls[0]![0]!.isApproved).toBe(false);
  });

  it('publishes a reviewer’s own submission immediately', async () => {
    vi.mocked(repo.createAlumnus).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    await service.createMember(admin, valid);
    expect(vi.mocked(repo.createAlumnus).mock.calls[0]![0]!.isApproved).toBe(true);
  });

  it('records the submitter, not a client-supplied id', async () => {
    vi.mocked(repo.createAlumnus).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    await service.createMember(member, { ...valid, addedById: 'someone-else' });
    expect(vi.mocked(repo.createAlumnus).mock.calls[0]![0]!.addedById).toBe('u1');
  });
});

describe('updateMember', () => {
  it('lets the owner edit', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    vi.mocked(repo.updateAlumnus).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    const result = await service.updateMember(member, 'm1', {
      roleType: 'Alumni', fullName: 'New Name', bio: 'New bio',
    });
    expect(result.ok).toBe(true);
  });

  it('refuses a non-owner who is not a reviewer', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({
      record: record({ addedById: 'other' }) as never, roleType: 'Alumni',
    });
    const result = await service.updateMember(member, 'm1', {
      roleType: 'Alumni', fullName: 'New Name', bio: 'New bio',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });
});

describe('deleteMember', () => {
  it('refuses a signed-in non-reviewer even for their own entry', async () => {
    // This is the audited hole: the old handler authenticated and then deleted.
    vi.mocked(repo.findMemberById).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    const result = await service.deleteMember(member, 'm1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(repo.deleteMember).not.toHaveBeenCalled();
  });

  it('refuses anonymous callers', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    expect((await service.deleteMember(anon, 'm1')).ok).toBe(false);
  });

  it('allows a reviewer', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    vi.mocked(repo.deleteMember).mockResolvedValue(undefined);
    expect((await service.deleteMember(admin, 'm1')).ok).toBe(true);
    expect(repo.deleteMember).toHaveBeenCalledWith('m1', 'Alumni');
  });
});

describe('setMemberApproval', () => {
  it('is reviewers only', async () => {
    const result = await service.setMemberApproval(member, 'm1', {
      roleType: 'Alumni', isApproved: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });

  it('validates the payload', async () => {
    const result = await service.setMemberApproval(admin, 'm1', { isApproved: 'yes' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
  });
});

describe('coverage of the remaining paths', () => {
  it('reports NotFound when updating something that does not exist', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue(null);
    const result = await service.updateMember(admin, 'gone', {
      roleType: 'Alumni', fullName: 'X', bio: 'Y',
    });
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('reports NotFound when approving something that does not exist', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue(null);
    const result = await service.setMemberApproval(admin, 'gone', {
      roleType: 'Alumni', isApproved: true,
    });
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('approves an existing entry', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({ record: record() as never, roleType: 'Alumni' });
    vi.mocked(repo.setApproval).mockResolvedValue(undefined);
    expect((await service.setMemberApproval(admin, 'm1', { roleType: 'Alumni', isApproved: false })).ok).toBe(true);
    expect(repo.setApproval).toHaveBeenCalledWith('m1', 'Alumni', false);
  });

  it('creates a speaker through the speaker branch', async () => {
    vi.mocked(repo.createSpeaker).mockResolvedValue({
      record: record({ title: 'Professor' }) as never, roleType: 'Speaker',
    });
    const result = await service.createMember(admin, {
      category: 'Speaker', fullName: 'A Speaker', title: 'Professor', bio: 'Bio',
    });
    expect(result.ok).toBe(true);
    expect(repo.createSpeaker).toHaveBeenCalled();
  });

  it('labels a Featured Guest correctly', async () => {
    vi.mocked(repo.createSpeaker).mockResolvedValue({
      record: record({ title: 'Featured Guest' }) as never, roleType: 'Speaker',
    });
    await service.createMember(admin, {
      category: 'Featured Guest', fullName: 'A Guest', bio: 'Bio',
    });
    expect(vi.mocked(repo.createSpeaker).mock.calls[0]![0]!.title).toBe('Featured Guest');
  });

  it('updates a speaker through the speaker branch', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue({ record: record() as never, roleType: 'Speaker' });
    vi.mocked(repo.updateSpeaker).mockResolvedValue({ record: record() as never, roleType: 'Speaker' });
    const result = await service.updateMember(admin, 'm1', {
      roleType: 'Speaker', fullName: 'N', bio: 'B', title: 'T',
    });
    expect(result.ok).toBe(true);
    expect(repo.updateSpeaker).toHaveBeenCalled();
  });

  it('turns a repository failure into an Internal error without leaking it', async () => {
    vi.mocked(repo.createAlumnus).mockRejectedValue(new Error('duplicate key value violates unique constraint'));
    const result = await service.createMember(member, {
      category: 'Alumni', fullName: 'A', cohort: '2020', bio: 'B',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Internal');
      expect(result.error.message).not.toContain('duplicate key');
    }
  });

  it('reports NotFound when deleting something that does not exist', async () => {
    vi.mocked(repo.findMemberById).mockResolvedValue(null);
    const result = await service.deleteMember(admin, 'gone');
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});
