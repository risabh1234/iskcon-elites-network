import { MemberCard } from '@/components/patterns';
import type { MemberDto } from '@/domain/member/dto';

/** Portrait-led browsing. Three up on desktop, one on a phone. */
export function DirectoryGallery({ members }: { members: MemberDto[] }) {
  return (
    <ul className="stagger grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 md:grid-cols-2 lg:grid-cols-3">
      {members.map((member, i) => (
        <li key={member.id} style={{ '--i': i } as React.CSSProperties}>
          <MemberCard
            href={`/directory/${member.slug}`}
            transitionName={`portrait-${member.slug}`}
            name={member.initiatedName ?? member.name}
            headline={member.headline}
            location={member.location}
            avatarUrl={member.avatarUrl}
            tags={member.expertise.map((e) => e.label)}
            status={member.status === 'APPROVED' ? undefined : 'pending'}
          />
        </li>
      ))}
    </ul>
  );
}
