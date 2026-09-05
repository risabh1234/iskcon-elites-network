import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/member/repository', () => ({
  listMembers: vi.fn(), countMembers: vi.fn(), findMemberById: vi.fn(),
  findMemberBySlug: vi.fn(), searchMembers: vi.fn(), findManyByIds: vi.fn(),
  createMember: vi.fn(), findRelated: vi.fn(), listCountries: vi.fn(),
  updateMember: vi.fn(), archiveMember: vi.fn(), restoreMember: vi.fn(),
  slugExists: vi.fn(), listExpertise: vi.fn(),
}));
vi.mock('@/server/cache', () => ({
  invalidate: vi.fn(),
  tags: { member: (id: string) => `member:${id}`, members: () => 'members' },
}));
vi.mock('@/domain/audit/service', () => ({ record: vi.fn() }));

import * as repo from '@/domain/member/repository';
import * as audit from '@/domain/audit/service';
import * as service from '@/domain/member/service';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };
const admin: Actor = { kind: 'user', name: null, id: 'a1', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };

const record = (over: Record<string, unknown> = {}) => ({
  id: 'm1', slug: 'srivasa-thakura', kind: 'ALUMNUS', legalName: 'Śrīvāsa Ṭhākura',
  initiatedName: null, headline: 'Consultant cardiologist', bio: 'Bio',
  city: 'Mumbai', countryCode: 'IN', cohort: '2018', email: 'contact@example.com',
  story: null, recommendation: null, status: 'APPROVED', visibility: 'NETWORK',
  approvedAt: new Date('2026-01-02'), createdAt: new Date('2026-01-01'),
  submittedById: 'u1', userId: null, avatarAsset: null,
  expertise: [{ expertise: { slug: 'medicine', label: 'Medicine', category: 'Health' } }],
  roles: [], links: [], ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.slugExists).mockResolvedValue(false);
  vi.mocked(repo.findManyByIds).mockResolvedValue([]);
});

describe('listMembers', () => {
  it('refuses unpublished entries to a non-reviewer', async () => {
    const result = await service.listMembers(member, { includeUnpublished: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(repo.listMembers).not.toHaveBeenCalled();
  });

  it('asks for published entries only when the caller is anonymous', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue({ rows: [], nextCursor: null });
    await service.listMembers(anon);
    expect(vi.mocked(repo.listMembers).mock.calls[0]![0]!.includeUnpublished).toBe(false);
  });

  it('passes the cursor through and returns the next one', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue({ rows: [record() as never], nextCursor: 'm9' });
    const result = await service.listMembers(anon, { cursor: 'm0' });
    expect(vi.mocked(repo.listMembers).mock.calls[0]![0]!.cursor).toBe('m0');
    if (result.ok) expect(result.value.nextCursor).toBe('m9');
  });

  it('withholds contact addresses from anonymous callers and shows them to members', async () => {
    vi.mocked(repo.listMembers).mockResolvedValue({ rows: [record() as never], nextCursor: null });
    const asAnon = await service.listMembers(anon);
    if (asAnon.ok) expect(asAnon.value.members[0]!.email).toBeUndefined();

    const asMember = await service.listMembers(member);
    if (asMember.ok) expect(asMember.value.members[0]!.email).toBe('contact@example.com');
  });
});

describe('getMember', () => {
  it('resolves by slug first, then falls back to id', async () => {
    vi.mocked(repo.findMemberBySlug).mockResolvedValue(record() as never);
    expect((await service.getMember(anon, 'srivasa-thakura')).ok).toBe(true);
    expect(repo.findMemberById).not.toHaveBeenCalled();

    vi.mocked(repo.findMemberBySlug).mockResolvedValue(null);
    vi.mocked(repo.findMemberById).mockResolvedValue(record() as never);
    expect((await service.getMember(anon, 'm1')).ok).toBe(true);
  });

  it('answers NotFound — not Forbidden — for an unpublished entry', async () => {
    vi.mocked(repo.findMemberBySlug).mockResolvedValue(null);
    vi.mocked(repo.findMemberById).mockResolvedValue(
      record({ status: 'PENDING', submittedById: 'someone' }) as never,
    );
    const result = await service.getMember(anon, 'm1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});

describe('createMember', () => {
  const valid = { kind: 'ALUMNUS', legalName: 'A Person', bio: 'A bio', cohort: '2019' };

  it('refuses anonymous submissions', async () => {
    const result = await service.createMember(anon, valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Unauthenticated');
  });

  it('derives a slug that folds diacritics', async () => {
    vi.mocked(repo.createMember).mockResolvedValue(record() as never);
    await service.createMember(member, { ...valid, legalName: 'Śrīvāsa Ṭhākura' });
    expect(vi.mocked(repo.createMember).mock.calls[0]![0]!.slug).toBe('srivasa-thakura');
  });

  it('leaves an ordinary submission PENDING and publishes a reviewer’s immediately', async () => {
    vi.mocked(repo.createMember).mockResolvedValue(record() as never);
    await service.createMember(member, valid);
    expect(vi.mocked(repo.createMember).mock.calls[0]![0]!.status).toBe('PENDING');

    vi.clearAllMocks();
    vi.mocked(repo.slugExists).mockResolvedValue(false);
    vi.mocked(repo.createMember).mockResolvedValue(record() as never);
    await service.createMember(admin, valid);
    expect(vi.mocked(repo.createMember).mock.calls[0]![0]!.status).toBe('APPROVED');
  });

  it('records the submitter, ignoring anything the client sent', async () => {
    vi.mocked(repo.createMember).mockResolvedValue(record() as never);
    await service.createMember(member, { ...valid, submittedById: 'someone-else' });
    expect(vi.mocked(repo.createMember).mock.calls[0]![0]!.submittedById).toBe('u1');
  });

  it('rejects an invalid payload with field detail', async () => {
    const result = await service.createMember(member, { kind: 'ALUMNUS', legalName: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Validation');
      expect(result.error.fields).toBeDefined();
    }
  });
});

describe('approval writes an audit entry', () => {
  beforeEach(() => {
    vi.mocked(repo.findMemberById).mockResolvedValue(record({ status: 'PENDING' }) as never);
    vi.mocked(repo.updateMember).mockResolvedValue(record() as never);
  });

  it('is reviewers only', async () => {
    const result = await service.setMemberApproval(member, 'm1', { isApproved: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('records who approved what, with the previous status', async () => {
    expect((await service.setMemberApproval(admin, 'm1', { isApproved: true })).ok).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'a1', action: 'member.approve', entity: 'Member', entityId: 'm1',
        before: { status: 'PENDING' },
      }),
    );
  });

  it('records a rejection with its reason', async () => {
    await service.setMemberApproval(admin, 'm1', { isApproved: false, reason: 'Not a member' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'member.reject',
        after: { status: 'REJECTED', reason: 'Not a member' },
      }),
    );
  });
});

describe('deleteMember archives rather than destroys', () => {
  beforeEach(() => {
    vi.mocked(repo.findMemberById).mockResolvedValue(record() as never);
  });

  it('refuses a signed-in non-reviewer, even for their own entry', async () => {
    const result = await service.deleteMember(member, 'm1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(repo.archiveMember).not.toHaveBeenCalled();
  });

  it('soft-deletes and audits when a reviewer does it', async () => {
    expect((await service.deleteMember(admin, 'm1')).ok).toBe(true);
    expect(repo.archiveMember).toHaveBeenCalledWith('m1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'member.archive', entity: 'Member' }),
    );
  });
});

describe('searchMembers', () => {
  it('never lets a non-reviewer widen the search to unpublished rows', async () => {
    vi.mocked(repo.searchMembers).mockResolvedValue([]);
    await service.searchMembers(member, { q: 'mumbai', includeUnpublished: true });
    expect(vi.mocked(repo.searchMembers).mock.calls[0]![0]!.includeUnpublished).toBe(false);
  });

  it('allows a reviewer to', async () => {
    vi.mocked(repo.searchMembers).mockResolvedValue([]);
    await service.searchMembers(admin, { q: 'mumbai', includeUnpublished: true });
    expect(vi.mocked(repo.searchMembers).mock.calls[0]![0]!.includeUnpublished).toBe(true);
  });

  it('rejects an empty query rather than scanning the table', async () => {
    const result = await service.searchMembers(anon, { q: '   ' });
    expect(result.ok).toBe(false);
    expect(repo.searchMembers).not.toHaveBeenCalled();
  });

  it('hydrates ranked hits into the same shape the list returns', async () => {
    // One shape everywhere: the gallery renders search results and browse
    // results with the same card, so search must not return a thinner row.
    vi.mocked(repo.searchMembers).mockResolvedValue([
      { id: 'm2', slug: 's', kind: 'ALUMNUS', legalName: 'B', initiatedName: null,
        headline: null, city: null, countryCode: null, status: 'APPROVED', rank: 0.9 },
    ] as never);
    vi.mocked(repo.findManyByIds).mockResolvedValue([record({ id: 'm2' }) as never]);

    const result = await service.searchMembers(anon, { q: 'mumbai' });
    expect(repo.findManyByIds).toHaveBeenCalledWith(['m2']);
    if (result.ok) {
      expect(result.value.members[0]!.expertise).toHaveLength(1);
      // Relevance order is not stable enough to resume from.
      expect(result.value.nextCursor).toBeNull();
    }
  });
});

describe('facets are built from what the register actually holds', () => {
  it('resolves country codes to names and sorts them alphabetically', async () => {
    vi.mocked(repo.listExpertise).mockResolvedValue([
      { slug: 'law', label: 'Law', category: 'Public life', _count: { members: 4 } },
    ] as never);
    vi.mocked(repo.listCountries).mockResolvedValue([
      { countryCode: 'IN', count: 120 },
      { countryCode: 'DE', count: 3 },
    ] as never);

    const result = await service.listFacets();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.countries.map((c) => c.name)).toEqual(['Germany', 'India']);
      expect(result.value.expertise[0]).toMatchObject({ slug: 'law', count: 4 });
    }
  });

  it('falls back to the raw code for a region Intl does not know', async () => {
    vi.mocked(repo.listExpertise).mockResolvedValue([]);
    vi.mocked(repo.listCountries).mockResolvedValue([{ countryCode: 'ZZ', count: 1 }] as never);
    const result = await service.listFacets();
    if (result.ok) expect(result.value.countries[0]!.code).toBe('ZZ');
  });
});

describe('relatedMembers', () => {
  it('asks for people in the same city and the same fields', async () => {
    vi.mocked(repo.findRelated).mockResolvedValue([record({ id: 'm2' }) as never]);
    const dto = (await service.getMember(anon, 'm1')).ok
      ? (await service.getMember(anon, 'm1') as { ok: true; value: never }).value
      : null;

    vi.mocked(repo.findMemberBySlug).mockResolvedValue(record() as never);
    const base = await service.getMember(anon, 'srivasa-thakura');
    if (!base.ok) throw new Error('fixture');

    const related = await service.relatedMembers(anon, base.value, 3);
    expect(repo.findRelated).toHaveBeenCalledWith(
      { id: 'm1', city: 'Mumbai', expertiseSlugs: ['medicine'] },
      3,
    );
    expect(related).toHaveLength(1);
    expect(dto).toBeDefined();
  });
});

describe('suggestMembers', () => {
  it('returns the light ranked rows without hydrating them', async () => {
    vi.mocked(repo.searchMembers).mockResolvedValue([
      { id: 'm1', slug: 's', kind: 'ALUMNUS', legalName: 'A', initiatedName: null,
        headline: null, city: 'Mumbai', countryCode: 'IN', status: 'APPROVED', rank: 1 },
    ] as never);

    const result = await service.suggestMembers(anon, { q: 'a' });
    expect(repo.findManyByIds).not.toHaveBeenCalled();
    if (result.ok) expect(result.value[0]!.location).toBe('Mumbai, India');
  });
});
