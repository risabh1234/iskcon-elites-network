import Link from 'next/link';
import { Building2, GraduationCap, MapPin } from 'lucide-react';
import { Badge } from '@/components/primitives';
import type { MemberDto } from '@/domain/member/dto';

/** Structured facts as a definition list, not a wall of paragraphs. */
export function MemberFacts({ member }: { member: MemberDto }) {
  const facts: { icon: React.ReactNode; term: string; value: React.ReactNode }[] = [];

  if (member.location) {
    facts.push({ icon: <MapPin className="size-[var(--spacing-3)]" />, term: 'Based in', value: member.location });
  }
  if (member.cohort) {
    facts.push({ icon: <GraduationCap className="size-[var(--spacing-3)]" />, term: 'Cohort', value: member.cohort });
  }
  for (const org of member.organizations) {
    facts.push({
      icon: <Building2 className="size-[var(--spacing-3)]" />,
      term: org.title,
      value: org.name,
    });
  }

  if (facts.length === 0 && member.expertise.length === 0) return null;

  return (
    <>
      {facts.length > 0 ? (
        <dl className="mt-[var(--spacing-6)] grid grid-cols-1 gap-[var(--spacing-3)] sm:grid-cols-2">
          {facts.map((fact, i) => (
            <div key={`${fact.term}-${i}`} className="flex items-start gap-[var(--spacing-3)]">
              <span className="mt-[var(--spacing-1)] text-ink-faint" aria-hidden>{fact.icon}</span>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-subtle">{fact.term}</dt>
                <dd className="text-sm text-ink">{fact.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      ) : null}

      {member.expertise.length > 0 ? (
        <ul className="mt-[var(--spacing-5)] flex list-none flex-wrap gap-[var(--spacing-2)] p-0">
          {member.expertise.map((e) => (
            <li key={e.slug}>
              <Link href={`/directory?expertise=${e.slug}`} className="no-underline">
                <Badge tone="outline">{e.label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
