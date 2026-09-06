import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { siteUrl } from '@/lib/site';
import { isAdminHost } from '@/server/hosting';

/**
 * The console, the auth pages and the API are kept out of the index. Not for
 * secrecy — they are protected by policy, not obscurity — but because a search
 * result pointing at a sign-in form is a bad result.
 *
 * On the console's own subdomain the answer is different and shorter: nothing
 * there is for readers, so nothing there is for crawlers either. Serving the
 * public site's robots.txt on that host would invite indexing of a hostname
 * that only ever answers with a sign-in form.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host');

  if (isAdminHost(host, process.env.NEXT_PUBLIC_ADMIN_HOST ?? null)) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

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
