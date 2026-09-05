import type { MemberDto } from '@/domain/member/dto';

/**
 * Schema.org Person. Contact details are deliberately absent — the DTO already
 * withholds them from anonymous readers, and structured data is read by
 * crawlers, which are always anonymous.
 */
export function PersonJsonLd({ member }: { member: MemberDto }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: member.initiatedName ?? member.name,
    alternateName: member.initiatedName ? member.name : undefined,
    description: member.headline ?? undefined,
    address: member.location ?? undefined,
    knowsAbout: member.expertise.map((e) => e.label),
    worksFor: member.organizations.map((o) => ({ '@type': 'Organization', name: o.name })),
    url: `/directory/${member.slug}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
