/** @type {import('next').NextConfig} */
const ContentSecurityPolicy = `
 default-src 'self';
 script-src 'self' 'unsafe-eval' 'unsafe-inline';
 style-src 'self' 'unsafe-inline';
 img-src 'self' blob: data: https://*.cloudflarestorage.com https://*.s3.amazonaws.com https://*.supabase.co https://lh3.googleusercontent.com;
 media-src 'self' https://*.cloudflarestorage.com https://*.s3.amazonaws.com https://www.youtube.com https://*.supabase.co;
 frame-src 'self' https://www.youtube.com;
 connect-src 'self' https://api.formspree.io;
 font-src 'self' data:;
 object-src 'none';
 base-uri 'self';
 form-action 'self' https://formspree.io https://accounts.google.com;
 frame-ancestors 'none';
 block-all-mixed-content;
 upgrade-insecure-requests;
`;

const securityHeaders = [
 { key: 'Content-Security-Policy', value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim() },
 { key: 'X-Frame-Options', value: 'DENY' },
 { key: 'X-Content-Type-Options', value: 'nosniff' },
 { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
 { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
 { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' }
];

const nextConfig = {
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
