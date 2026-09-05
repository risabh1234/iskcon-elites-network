import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/primitives';
import { PageHeader, Prose, Section } from '@/components/patterns';

export const metadata: Metadata = {
  title: 'About',
  description:
    'What the ISKCON Elites Network is, who it is for, and how entries to the register are reviewed.',
};

/** Short and confident. The case for the institution, not a brochure. */
export default function AboutPage() {
  return (
    <Section>
      <PageHeader eyebrow="About" title="What this is" />

      <div className="mt-[var(--spacing-7)]">
        <Prose>
          <p>
            The ISKCON Elites Network is a register of people who practise a tradition and a
            profession without asking either to make room for the other — physicians, civil
            servants, engineers, teachers, founders and scholars who did not treat the two as a
            compromise.
          </p>

          <h2>Why a register</h2>
          <p>
            Networks of this kind usually exist as a mailing list nobody reads and a group chat
            nobody can search. The value is in being able to find one specific person: someone in
            your field, in your city, who has already faced whatever you are facing. That is a
            directory problem, and it is worth solving properly.
          </p>

          <h2>Who it is for</h2>
          <p>
            Members of the network. Entries are submitted by members and reviewed before they
            appear, and contact details are visible only to people who have signed in — the register
            exists so the network can reach itself, not so addresses can be collected from a public
            page.
          </p>

          <h2>How entries are reviewed</h2>
          <p>
            Every submission enters a queue. A reviewer checks that the person is who the entry says
            they are, and either publishes it or returns it with a reason. Nothing is deleted:
            withdrawn entries are archived, because the register&rsquo;s history is part of the
            register.
          </p>

          <h2>What it is not</h2>
          <p>
            It is not a social network, a fundraising list, or a place to advertise. There is no
            feed. The register does one thing, and the measure of whether it works is whether people
            find each other in it.
          </p>
        </Prose>

        <div className="mt-[var(--spacing-8)] flex flex-wrap gap-[var(--spacing-3)]">
          <Button asChild variant="primary">
            <Link href="/directory">Open the directory</Link>
          </Button>
          <Button asChild>
            <Link href="/mentorship">Find a mentor</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
