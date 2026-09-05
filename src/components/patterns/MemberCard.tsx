import Link from 'next/link';
import { Avatar } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { cn } from '@/lib/cn';

export interface MemberCardProps {
  href: string;
  name: string;
  /** What they do — role and organisation, not a biography. */
  headline?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  tags?: string[];
  /** Admin-only signal; omit on public surfaces. */
  status?: 'pending' | 'approved' | 'rejected';
  className?: string;
}

const statusTone = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
} as const;

/**
 * Portrait-led. No hover-scale: the card is a link, and lift-on-hover is the
 * consumer-SaaS tell. The only hover change is the hairline going a shade darker.
 */
export function MemberCard({
  href,
  name,
  headline,
  location,
  avatarUrl,
  tags,
  status,
  className,
}: MemberCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col no-underline',
        'rounded-sm border border-line bg-paper-raised p-[var(--spacing-4)]',
        'transition-colors duration-[var(--dur-fast)] ease-standard',
        'hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-start gap-[var(--spacing-4)]">
        <Avatar name={name} src={avatarUrl} size="lg" shape="square" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-[var(--spacing-2)]">
            <p className="font-display text-lg text-ink">{name}</p>
            {status ? <Badge tone={statusTone[status]}>{status}</Badge> : null}
          </div>

          {headline ? (
            <p className="mt-[var(--spacing-1)] text-sm text-ink-muted line-clamp-2">{headline}</p>
          ) : null}

          {location ? (
            <p className="mt-[var(--spacing-2)] text-xs text-ink-subtle">{location}</p>
          ) : null}
        </div>
      </div>

      {tags && tags.length > 0 ? (
        <div className="mt-[var(--spacing-4)] flex flex-wrap gap-[var(--spacing-2)]">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} tone="outline">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 ? <Badge tone="outline">+{tags.length - 3}</Badge> : null}
        </div>
      ) : null}
    </Link>
  );
}
