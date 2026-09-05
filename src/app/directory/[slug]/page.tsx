import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowLeft, Link2 } from 'lucide-react';
import { Avatar, Badge, Button } from '@/components/primitives';
import { MemberCard, Prose, Section } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { getMember, relatedMembers } from '@/domain/member/service';
import { MemberFacts } from './MemberFacts';
import { PersonJsonLd } from './PersonJsonLd';

type Props = { params: Promise<{ slug: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Anonymous deliberately: metadata is public, so an unreviewed profile must
  // not contribute a title even when an admin requests the page.
  const result = await getMember({ kind: 'anonymous' }, slug);

  if (!result.ok) return { title: 'Profile not found', robots: { index: false } };

  const member = result.value;
  const name = member.initiatedName ?? member.name;
  const description = member.headline ?? member.bio.slice(0, 160);

  return {
    title: name,
    description,
    alternates: { canonical: `/directory/${member.slug}` },
    openGraph: {
      type: 'profile',
      title: name,
      description,
      url: `/directory/${member.slug}`,
    },
    twitter: { card: 'summary_large_image', title: name, description },
  };
}

export default async function MemberProfilePage({ params }: Props) {
  const { slug } = await params;
  const actor = await getActor();

  const result = await getMember(actor, slug);
  if (!result.ok) notFound();

  const member = result.value;

  // Old links used the row id. Redirect permanently so the slug becomes the
  // one canonical address and search engines follow.
  if (UUID.test(slug) && member.slug !== slug) {
    permanentRedirect(`/directory/${member.slug}`);
  }

  const related = await relatedMembers(actor, member, 3);

  return (
    <Section>
      <Button asChild variant="link" className="mb-[var(--spacing-6)]">
        <Link href="/directory">
          <ArrowLeft className="size-[var(--spacing-3)]" />
          Back to the directory
        </Link>
      </Button>

      <article className="grid gap-[var(--spacing-8)] lg:grid-cols-[18rem_1fr]">
        <header className="lg:sticky lg:top-[var(--spacing-8)] lg:self-start">
          {/* 4:5 is the portrait crop the register standardises on. */}
          <div className="aspect-4/5 w-full max-w-[18rem] overflow-hidden rounded-sm border border-line bg-paper-sunken">
            {member.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={member.avatarUrl}
                alt=""
                className="size-full object-cover"
                width={member.blurhash ? undefined : 640}
              />
            ) : (
              <div className="grid size-full place-items-center">
                <Avatar name={member.initiatedName ?? member.name} size="xl" shape="square" />
              </div>
            )}
          </div>

          {member.status !== 'APPROVED' ? (
            <p className="mt-[var(--spacing-3)]">
              <Badge tone="warning">Awaiting review</Badge>
            </p>
          ) : null}
        </header>

        <div className="min-w-0">
          {member.initiatedName ? (
            <p className="text-2xs uppercase tracking-wide text-ink-subtle">{member.name}</p>
          ) : null}

          <h1 className="mt-[var(--spacing-2)] text-4xl">
            {member.initiatedName ?? member.name}
          </h1>

          {member.headline ? (
            <p className="mt-[var(--spacing-3)] text-lg text-ink-muted">{member.headline}</p>
          ) : null}

          <MemberFacts member={member} />

          <div className="mt-[var(--spacing-7)] border-t border-line pt-[var(--spacing-6)]">
            <Prose>
              <p className="whitespace-pre-wrap">{member.bio}</p>
            </Prose>
          </div>

          {member.recommendation ? (
            <blockquote className="mt-[var(--spacing-7)] border-l-2 border-accent pl-[var(--spacing-5)] font-display text-xl text-ink">
              {member.recommendation}
            </blockquote>
          ) : null}

          {member.links.length > 0 ? (
            <ul className="mt-[var(--spacing-7)] flex list-none flex-wrap gap-[var(--spacing-3)] p-0">
              {member.links.map((link) => (
                <li key={link.url}>
                  <Button asChild size="sm">
                    <a href={link.url} rel="noopener noreferrer nofollow" target="_blank">
                      <Link2 className="size-[var(--spacing-3)]" />
                      {link.label ?? link.kind.toLowerCase()}
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-[var(--spacing-10)] border-t border-line pt-[var(--spacing-7)]">
          <h2 className="text-xl">
            {member.city ? `Also in ${member.city}` : 'Also in the register'}
          </h2>
          <ul className="mt-[var(--spacing-5)] grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 md:grid-cols-3">
            {related.map((other) => (
              <li key={other.id}>
                <MemberCard
                  href={`/directory/${other.slug}`}
                  name={other.initiatedName ?? other.name}
                  headline={other.headline}
                  location={other.location}
                  avatarUrl={other.avatarUrl}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PersonJsonLd member={member} />
    </Section>
  );
}
