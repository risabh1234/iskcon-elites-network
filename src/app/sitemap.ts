import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
import { listMembers } from '@/domain/member/service';
import { listEvents } from '@/domain/event/service';
import { listStories } from '@/domain/story/service';

const ANONYMOUS = { kind: 'anonymous' } as const;

/**
 * Built from what is actually published.
 *
 * Generated as an anonymous reader on purpose: the sitemap is a public
 * document, so it must contain exactly what a stranger can see. Asking for it
 * as an admin would list every unreviewed profile in the register.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/directory`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/events`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/success-stories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/mentorship`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const [members, events, stories] = await Promise.all([
      listMembers(ANONYMOUS, { limit: 100, sort: 'recent' }),
      listEvents(ANONYMOUS),
      listStories(ANONYMOUS),
    ]);

    return [
      ...staticRoutes,
      ...(members.ok
        ? members.value.members.map((m) => ({
            url: `${base}/directory/${m.slug}`,
            lastModified: new Date(m.createdAt),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          }))
        : []),
      ...(events.ok
        ? events.value.map((e) => ({
            url: `${base}/events#${e.slug}`,
            lastModified: new Date(e.createdAt),
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          }))
        : []),
      ...(stories.ok
        ? stories.value
            .filter((s) => s.status === 'PUBLISHED')
            .map((s) => ({
              url: `${base}/success-stories/${s.slug}`,
              lastModified: s.publishedAt ? new Date(s.publishedAt) : undefined,
              changeFrequency: 'monthly' as const,
              priority: 0.6,
            }))
        : []),
    ];
  } catch {
    // A sitemap listing the six pages that certainly exist is better than a
    // 500 that tells a crawler the site is broken.
    return staticRoutes;
  }
}
