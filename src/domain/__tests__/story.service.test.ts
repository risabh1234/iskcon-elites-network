import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/story/repository', () => ({ listStories: vi.fn(), findBySlug: vi.fn() }));

import * as repo from '@/domain/story/repository';
import { getStory, listStories } from '@/domain/story/service';

const anon: Actor = { kind: 'anonymous' };
const admin: Actor = { kind: 'user', name: null, id: 'a1', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };

const story = (over: Record<string, unknown> = {}) => ({
  id: 's1', slug: 'a-story', title: 'A story', excerpt: 'Excerpt', body: 'One.\n\nTwo.',
  status: 'PUBLISHED', publishedAt: new Date('2026-02-01'), createdAt: new Date('2026-01-01'),
  authorId: 'a1', author: { name: 'Editorial' },
  member: { slug: 'srivasa', legalName: 'Śrīvāsa Ṭhākura', initiatedName: 'Gaura Nitai Dāsa' },
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('listStories', () => {
  it('asks for published stories only when the reader is anonymous', async () => {
    vi.mocked(repo.listStories).mockResolvedValue([]);
    await listStories(anon);
    expect(repo.listStories).toHaveBeenCalledWith(false);
  });

  it('includes drafts for a reviewer', async () => {
    vi.mocked(repo.listStories).mockResolvedValue([]);
    await listStories(admin);
    expect(repo.listStories).toHaveBeenCalledWith(true);
  });

  it('prefers the initiated name for the linked member', async () => {
    vi.mocked(repo.listStories).mockResolvedValue([story() as never]);
    const result = await listStories(anon);
    if (result.ok) expect(result.value[0]!.member?.name).toBe('Gaura Nitai Dāsa');
  });

  it('carries a real byline or none — never a placeholder', async () => {
    vi.mocked(repo.listStories).mockResolvedValue([story({ author: null }) as never]);
    const result = await listStories(anon);
    if (result.ok) expect(result.value[0]!.author).toBeNull();
  });
});

describe('getStory', () => {
  it('answers NotFound for an unknown slug', async () => {
    vi.mocked(repo.findBySlug).mockResolvedValue(null);
    const result = await getStory(anon, 'nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('hides a draft from the public but shows it to a reviewer', async () => {
    vi.mocked(repo.findBySlug).mockResolvedValue(story({ status: 'DRAFT' }) as never);
    expect((await getStory(anon, 'a-story')).ok).toBe(false);
    expect((await getStory(admin, 'a-story')).ok).toBe(true);
  });

  it('never returns the author id', async () => {
    vi.mocked(repo.findBySlug).mockResolvedValue(story() as never);
    const result = await getStory(anon, 'a-story');
    if (result.ok) expect('authorId' in result.value).toBe(false);
  });
});
