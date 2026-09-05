import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/primitives';
import { EmptyState, PageHeader, Prose, Section } from '@/components/patterns';

export const metadata: Metadata = {
  title: 'Mentorship',
  description:
    'Members of the ISKCON Elites Network who offer their time, and a way to ask for it.',
};

/**
 * The mentor index and the request flow depend on MentorshipProfile and
 * MentorshipRequest, which exist in the schema but have no seeded data and no
 * request state machine yet. Rather than mock a list of mentors — the sort of
 * invented content this rebuild removed from the home page — the page states
 * plainly where the feature stands and points at the directory, which works.
 */
export default function MentorshipPage() {
  return (
    <Section>
      <PageHeader
        eyebrow="Mentorship"
        title="Ask someone who has been there"
        lede="Members who offer their time, and a way to ask for it that is not a cold email."
      />

      <div className="mt-[var(--spacing-7)] grid gap-[var(--spacing-8)] lg:grid-cols-[1fr_20rem]">
        <Prose>
          <p>
            Mentorship in the network is deliberately narrow: a request names what you are trying
            to decide, the mentor accepts or declines, and if they accept you arrange one
            conversation. No programmes, no matching algorithm, no six-month commitment that both
            sides quietly abandon.
          </p>

          <h2>How a request works</h2>
          <ol>
            <li>You find someone in the register whose work is close to your question.</li>
            <li>You send a request saying what you want to talk about, in a paragraph.</li>
            <li>They accept, decline, or suggest someone better placed. Declining is normal.</li>
            <li>If accepted, you arrange a time and have the conversation.</li>
          </ol>

          <p>
            Mentors set how many requests they will take at once, so an accepted request means
            someone actually has room for it.
          </p>
        </Prose>

        <aside>
          <EmptyState
            title="Not open yet"
            description="Mentor profiles are being collected now. In the meantime the directory shows who is in the register and what they do."
            action={
              <Button asChild variant="primary">
                <Link href="/directory">Browse the directory</Link>
              </Button>
            }
          />
        </aside>
      </div>
    </Section>
  );
}
