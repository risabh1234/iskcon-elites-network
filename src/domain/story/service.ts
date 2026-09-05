import { can, type Actor } from '@/server/policy';
import { notFound } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import * as repo from './repository';

export type StoryDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  author: string | null;
  member: { slug: string; name: string } | null;
};

function toDto(record: repo.StoryRecord): StoryDto {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    body: record.body,
    status: record.status as StoryDto['status'],
    publishedAt: record.publishedAt?.toISOString() ?? null,
    // A real byline or none — never a placeholder.
    author: record.author?.name ?? null,
    member: record.member
      ? { slug: record.member.slug, name: record.member.initiatedName ?? record.member.legalName }
      : null,
  };
}

export async function listStories(actor: Actor): Promise<Result<StoryDto[]>> {
  const rows = await repo.listStories(can(actor, 'story:read', { isPublished: false }));
  return ok(rows.map(toDto));
}

export async function getStory(actor: Actor, slug: string): Promise<Result<StoryDto>> {
  const record = await repo.findBySlug(slug);
  if (!record) return err(notFound('That story could not be found.'));

  if (!can(actor, 'story:read', { isPublished: record.status === 'PUBLISHED' })) {
    return err(notFound('That story could not be found.'));
  }

  return ok(toDto(record));
}
