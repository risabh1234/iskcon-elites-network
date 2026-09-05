import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/primitives';
import { DesignClient } from './DesignClient';

export const metadata: Metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
};

/**
 * The review surface for the component library — every primitive in every state,
 * on one page, so inconsistency is caught here rather than in production.
 *
 * Blocked in production by middleware; this second check is defence in depth, so
 * the page cannot leak if the matcher is ever edited carelessly.
 */
/**
 * Rendered per request rather than prerendered. `notFound()` returns a real 404
 * status only for non-streamed responses — a statically prerendered page would
 * serve the not-found *body* with a 200, which is a soft 404 a crawler can index.
 */
export const dynamic = 'force-dynamic';

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <ToastProvider>
      <DesignClient />
    </ToastProvider>
  );
}
