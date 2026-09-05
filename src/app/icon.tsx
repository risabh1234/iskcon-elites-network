import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/site';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** A wordmark initial on paper. Legible at 16px, which is the only size that matters. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND.ink,
          color: BRAND.paper,
          fontSize: 300,
          fontFamily: 'serif',
        }}
      >
        I
      </div>
    ),
    size,
  );
}
