import { ImageResponse } from 'next/og';
import { BRAND, OG, SITE_NAME } from '@/lib/site';
import { getMember } from '@/domain/member/service';

export const alt = 'Member profile';
export const size = OG.size;
export const contentType = 'image/png';

/**
 * A card per member.
 *
 * Generated as an anonymous reader, like the metadata: an OG image is fetched
 * by crawlers and chat clients that have no session, so an unreviewed profile
 * must not produce one.
 */
export default async function MemberOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getMember({ kind: 'anonymous' }, slug);

  const name = result.ok ? (result.value.initiatedName ?? result.value.name) : SITE_NAME;
  const headline = result.ok ? result.value.headline : null;
  const location = result.ok ? result.value.location : null;

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
        <div style={{ display: 'flex', fontSize: 28, color: BRAND.inkMuted, letterSpacing: '0.08em' }}>
          {SITE_NAME.toUpperCase()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, color: BRAND.ink, lineHeight: 1.05, maxWidth: 1000 }}>
            {name}
          </div>
          {headline ? (
            <div style={{ display: 'flex', marginTop: 28, fontSize: 36, color: BRAND.inkMuted, maxWidth: 1000 }}>
              {headline}
            </div>
          ) : null}
          {location ? (
            <div style={{ display: 'flex', marginTop: 16, fontSize: 30, color: BRAND.inkMuted }}>
              {location}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', ...OG.rule, background: BRAND.accent }} />
      </div>
    ),
    size,
  );
}
