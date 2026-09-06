import Image from 'next/image';
import { cn } from '@/lib/cn';
import { Prose } from './Prose';

export interface LeaderProfileProps {
  displayName: string;
  initiatedName?: string | null;
  role?: string | null;
  headline?: string | null;
  paragraphs: string[];
  focusAreas: string[];
  initiatives: string[];
  portraitUrl?: string | null;
  portraitAlt?: string | null;
  className?: string;
}

/**
 * A single person, given the space a catalogue entry gets rather than the space
 * a profile card gets.
 *
 * The portrait is a fixed 4:5 frame with a hairline, not a circle: a circular
 * crop is the avatar convention, and an avatar reads as "a user account", which
 * is the opposite of what this page asserts. No lift, no shadow, no overlay
 * gradient — the photograph is evidence, not decoration.
 */
export function LeaderProfile({
  displayName,
  initiatedName,
  role,
  headline,
  paragraphs,
  focusAreas,
  initiatives,
  portraitUrl,
  portraitAlt,
  className,
}: LeaderProfileProps) {
  return (
    <article className={cn('grid gap-[var(--spacing-8)] lg:grid-cols-[18rem_1fr]', className)}>
      <div className="lg:sticky lg:top-[var(--spacing-6)] lg:self-start">
        {portraitUrl ? (
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-line bg-paper-sunken">
            <Image
              src={portraitUrl}
              alt={portraitAlt ?? ''}
              fill
              sizes="(min-width: 64rem) 18rem, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        {initiatedName && initiatedName !== displayName ? (
          <p className="mt-[var(--spacing-4)] font-deva text-sm text-ink-subtle">{initiatedName}</p>
        ) : null}
      </div>

      <div className="min-w-0">
        <h2 className="font-display text-3xl leading-tight text-ink">{displayName}</h2>

        {role ? <p className="mt-[var(--spacing-2)] text-ink">{role}</p> : null}
        {headline ? (
          <p className="mt-[var(--spacing-2)] max-w-[var(--measure-lede)] text-ink-muted">
            {headline}
          </p>
        ) : null}

        <Prose className="mt-[var(--spacing-6)]">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </Prose>

        <TextList heading="Speaks on" items={focusAreas} />
        <TextList heading="Outreach" items={initiatives} />
      </div>
    </article>
  );
}

/**
 * A heading and a hairline-separated list. Rendered only when there is
 * something in it — an empty "Outreach" heading claims work that isn't there.
 */
function TextList({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-[var(--spacing-8)]">
      <h3 className="text-2xs uppercase tracking-wide text-ink-subtle">{heading}</h3>
      <ul className="mt-[var(--spacing-4)] flex list-none flex-col p-0">
        {items.map((item, index) => (
          <li
            key={`${index}-${item}`}
            className="border-t border-line py-[var(--spacing-3)] text-sm text-ink-muted last:border-b"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
