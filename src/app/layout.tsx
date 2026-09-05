import type { Metadata, Viewport } from 'next';
import './globals.css';
import { fontVariables } from './fonts';
import Header from '@/components/layout/Header';
import { getActor } from '@/server/auth';
import Footer from '@/components/layout/Footer';

const SITE_NAME = 'ISKCON Elites Network';
const SITE_DESCRIPTION =
  'A register of accomplished people who share a tradition — alumni, speakers and mentors of the ISKCON Elites Network.';
const LOCALE = 'en';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://iskcon-elites-network.workers.dev';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Child segments set their own title; this frames it. `default` is required
    // whenever a template is set.
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  // Browser chrome is set from JS, not CSS, so this is the one place a colour
  // cannot come from a token. Must mirror --color-paper.
  themeColor: '#FAF9F7', // design-literal-allow
  colorScheme: 'light',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading the session here makes every route dynamic, which is the standing
  // cost of a session-aware header. Acceptable for a members' register where
  // the pages people actually use are dynamic already.
  const actor = await getActor();
  const user = actor.kind === 'user' ? { name: actor.name, email: actor.email } : null;

  return (
    <html lang={LOCALE} className={fontVariables}>
      <body>
        {/* First tab stop on every page: skip the nav, reach the content. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        <div className="flex min-h-screen flex-col">
          <Header user={user} />
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
