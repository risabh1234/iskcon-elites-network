import { ImageResponse } from 'next/og';
import { BRAND, OG, SITE_NAME } from '@/lib/site';

export const alt = SITE_NAME;
export const size = OG.size;
export const contentType = 'image/png';

/**
 * The default social card.
 *
 * Typeset rather than decorated: a rule, a wordmark and a sentence. Social
 * previews are seen at thumbnail size, so anything smaller than this is noise.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BRAND.paper,
          padding: OG.pad,
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: BRAND.inkMuted, letterSpacing: '0.08em' }}>
          THE REGISTER
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 78, color: BRAND.ink, lineHeight: 1.05, maxWidth: 900 }}>
            A register of people who kept both vocations.
          </div>
          <div style={{ display: 'flex', marginTop: 40, fontSize: 32, color: BRAND.inkMuted }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: 'flex', ...OG.rule, background: BRAND.accent }} />
      </div>
    ),
    size,
  );
}
