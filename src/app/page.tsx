import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Skeleton } from '@/components/primitives';
import { Container, MemberCard, Section } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listMembers } from '@/domain/member/service';

/**
 * Four movements, and nothing else.
 *
 *   1. Statement — one sentence of substance, set large, given air.
 *   2. Proof     — a live slice of the register. Real people, real faces.
 *   3. What the network does.
 *   4. Entry     — one action.
 *
 * The page this replaces opened with a hero over a stock photograph and seeded
 * itself with three invented members — "Dr. Arvind Ramesh, Senior Scientist,
 * ISRO" and two others, complete with invented quotes — which rendered on every
 * first paint and permanently whenever the fetch failed. Presenting fictional
 * people as members of a real institution's register is a credibility problem
 * before it is a design one.
 */
export default function HomePage() {
  return (
    <>
      <Statement />
      <Proof />
      <WhatTheNetworkDoes />
      <Entry />
    </>
  );
}

function Statement() {
  return (
    <Section size="large">
      <h1 className="max-w-[16ch] text-5xl">
        A register of people who kept both vocations.
      </h1>
      <p className="mt-[var(--spacing-6)] max-w-[var(--measure-lede)] text-lg text-ink-muted">
        Physicians, civil servants, engineers and teachers who practise a tradition and a
        profession without asking either to make room for the other. The directory exists so they
        can find each other.
      </p>
    </Section>
  );
}

function Proof() {
  return (
    <Section className="border-t border-line">
      <div className="flex flex-wrap items-end justify-between gap-[var(--spacing-4)]">
        <h2 className="text-2xl">In the register</h2>
        <Button asChild variant="link">
          <Link href="/directory">
            Browse all
            <ArrowRight className="size-[var(--spacing-3)]" />
          </Link>
        </Button>
      </div>

      <div className="mt-[var(--spacing-6)]">
        {/* Streamed: the statement above paints immediately and does not wait
            on the database. */}
        <Suspense fallback={<ProofSkeleton />}>
          <ProofList />
        </Suspense>
      </div>
    </Section>
  );
}

async function ProofList() {
  const actor = await getActor();
  const result = await listMembers(actor, { sort: 'recent', limit: 6 });

  // If the register cannot be read, the section simply does not appear. It
  // never falls back to invented people.
  if (!result.ok || result.value.members.length === 0) return null;

  return (
    <ul className="grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 md:grid-cols-2 lg:grid-cols-3">
      {result.value.members.map((member) => (
        <li key={member.id}>
          <MemberCard
            href={`/directory/${member.slug}`}
            name={member.initiatedName ?? member.name}
            headline={member.headline}
            location={member.location}
            avatarUrl={member.avatarUrl}
            tags={member.expertise.map((e) => e.label)}
          />
        </li>
      ))}
    </ul>
  );
}

function ProofSkeleton() {
  return (
    <ul className="grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="rounded-sm border border-line bg-paper-raised p-[var(--spacing-4)]">
          <div className="flex items-start gap-[var(--spacing-4)]">
            <Skeleton className="size-[var(--spacing-9)] shrink-0 rounded-sm" />
            <div className="flex-1">
              <Skeleton className="h-[var(--spacing-5)] w-[60%]" />
              <Skeleton className="mt-[var(--spacing-2)] h-[var(--spacing-4)] w-[85%]" />
              <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-3)] w-[40%]" />
            </div>
          </div>
          <div className="mt-[var(--spacing-4)] flex gap-[var(--spacing-2)]">
            <Skeleton className="h-[var(--spacing-4)] w-[5rem] rounded-full" />
            <Skeleton className="h-[var(--spacing-4)] w-[4rem] rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

const COLUMNS = [
  {
    title: 'The directory',
    body: 'Search the register by field, city or name. Every entry is reviewed before it appears.',
    href: '/directory',
    cta: 'Open the directory',
  },
  {
    title: 'Mentorship',
    body: 'Members who offer their time, and a way to ask for it that is not a cold email.',
    href: '/mentorship',
    cta: 'Find a mentor',
  },
  {
    title: 'Gatherings',
    body: 'Meetings in a dozen cities and online, with times shown in your own timezone.',
    href: '/events',
    cta: 'See what is coming',
  },
] as const;

function WhatTheNetworkDoes() {
  return (
    <Section className="border-t border-line">
      <div className="grid grid-cols-1 gap-[var(--spacing-8)] md:grid-cols-3">
        {COLUMNS.map((column) => (
          <div key={column.href}>
            <h2 className="text-xl">{column.title}</h2>
            <p className="mt-[var(--spacing-3)] text-ink-muted">{column.body}</p>
            <Button asChild variant="link" className="mt-[var(--spacing-4)]">
              <Link href={column.href}>
                {column.cta}
                <ArrowRight className="size-[var(--spacing-3)]" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

async function Entry() {
  const actor = await getActor();

  return (
    <Section size="large" bleed className="border-t border-line bg-paper-sunken">
      <Container>
        <div className="max-w-[var(--measure-lede)]">
          <h2 className="text-3xl">
            {actor.kind === 'user' ? 'Add yourself to the register' : 'Join the network'}
          </h2>
          <p className="mt-[var(--spacing-4)] text-ink-muted">
            {actor.kind === 'user'
              ? 'One entry, reviewed before it appears. It takes a few minutes.'
              : 'The register is open to members. Create an account, then submit your entry.'}
          </p>
          <Button asChild variant="primary" className="mt-[var(--spacing-6)]">
            <Link href={actor.kind === 'user' ? '/directory/submit' : '/sign-up'}>
              {actor.kind === 'user' ? 'Add an entry' : 'Create an account'}
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
