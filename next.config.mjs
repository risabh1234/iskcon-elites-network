/** @type {import('next').NextConfig} */
// Content-Security-Policy is NOT here: it carries a per-request nonce and so
// must be built in src/proxy.ts. These are the static ones.
const securityHeaders = [
 { key: 'X-Frame-Options', value: 'DENY' },
 { key: 'X-Content-Type-Options', value: 'nosniff' },
 { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
 { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
 { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' }
];

const nextConfig = {
 serverExternalPackages: ['@prisma/client', '.prisma/client', 'pg', 'pg-cloudflare'],
 reactStrictMode: true,
 images: {
 formats: ['image/avif', 'image/webp'],
 remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
 { protocol: 'https', hostname: '**.cloudflarestorage.com' },
 { protocol: 'https', hostname: '**.supabase.co' },
 ],
 },
 async headers() {
 return [{ source: '/(.*)', headers: securityHeaders }];
 },
};

export default nextConfig;
