import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * The console, the auth pages and the API are kept out of the index. Not for
 * secrecy — they are protected by policy, not obscurity — but because a search
 * result pointing at a sign-in form is a bad result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/sign-in', '/sign-up', '/design-system'],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
