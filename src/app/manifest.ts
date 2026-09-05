import type { MetadataRoute } from 'next';
import { BRAND, SITE_NAME } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'ISKCON Elites',
    description: 'The register of the ISKCON Elites Network.',
    start_url: '/',
    display: 'standalone',
    background_color: BRAND.paper,
    theme_color: BRAND.paper,
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
