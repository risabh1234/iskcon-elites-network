import { Metadata } from "next";
import DirectoryClient, { DirectoryMember } from "./DirectoryClient";
import { getActor } from "@/server/auth";
import { can } from "@/server/policy";
import { listMembers } from "@/domain/member/service";

export const metadata: Metadata = {
  title: "Global Alumni Directory | ISKCON Elites Network",
  description: "Browse the ISKCON Elites global directory of alumni from top-tier institutions.",
};

// Force dynamic so it doesn't statically cache empty states during deployment
export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const actor = await getActor();
  const isAdmin = can(actor, 'member:read:unpublished');

  // Reviewers see the queue; everyone else sees the register.
  const result = await listMembers(actor, { includeUnpublished: isAdmin, limit: 100 });
  const members: DirectoryMember[] = result.ok
    ? result.value.members.map((m) => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        roleType: m.roleType,
        primaryLabel: m.primaryLabel,
        secondaryLabel: m.secondaryLabel,
        bio: m.bio ?? undefined,
        email: m.email ?? null,
        story: m.story,
        recommendation: m.recommendation,
        category: m.category ?? undefined,
        cohort: m.cohort ?? undefined,
        title: m.title ?? undefined,
        isApproved: m.isApproved,
      }))
    : [];

  return (
    <div className="container mx-auto px-6 pt-32 pb-16 flex-1 max-w-6xl">
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-[#0C1A30]">Global <span className="text-[#C5A059] italic">Directory</span></h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Connect with elite academic minds. Filter by profession, location, and expertise to find the right mentors and peers.
        </p>
      </div>

      <DirectoryClient initialMembers={members} isAdmin={isAdmin} isSignedIn={actor.kind === 'user'} />
    </div>
  );
}
