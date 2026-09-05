import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/server/auth";
import { getMember } from "@/domain/member/service";
import { ArrowLeft, GraduationCap, Calendar } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // Anonymous on purpose: metadata is public, so an unpublished profile must
  // not contribute a title even when an admin is the one requesting the page.
  const result = await getMember({ kind: 'anonymous' }, id);

  if (!result.ok) {
    return { title: "Profile Not Found | ISKCON Elites" };
  }

  const member = result.value;

  return {
    title: `${member.name} | ISKCON Elites Network`,
    description: member.bio.substring(0, 160) || `View ${member.name}'s profile on the ISKCON Elites Network.`,
    openGraph: {
      title: `${member.name} - ISKCON Elites`,
      description: member.bio.substring(0, 160),
      images: member.avatarUrl ? [{ url: member.avatarUrl }] : [],
    },
  };
}

export default async function AlumnusProfilePage({ params }: Props) {
  const { id } = await params;

  // The service decides visibility: published to anyone, unpublished to
  // reviewers, and NotFound rather than Forbidden so that the existence of an
  // unreviewed profile is not itself disclosed.
  const result = await getMember(await getActor(), id);
  if (!result.ok) notFound();

  const member = result.value;
  const roleType = member.roleType;

  return (
    <div className="container mx-auto px-6 py-12 flex-1 max-w-4xl">
      <Link href="/directory" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-12 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 md:p-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative group w-48 h-48 shrink-0 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:border-white/30 flex items-center justify-center">
            {member.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={member.avatarUrl} 
                alt={member.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
            ) : (
              <div className="text-slate-400 text-6xl font-semibold tracking-tighter">
                {member.name.charAt(0)}
              </div>
            )}
            
            {/* Glossy hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
          
          <div className="space-y-4 flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {member.name}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-4 py-2 rounded-full">
                <GraduationCap className="w-4 h-4 text-slate-300" />
                {roleType === 'Alumni' ? member.category : member.title}
              </div>
              <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4 text-slate-300" />
                {roleType === 'Alumni' ? `Class of ${member.cohort}` : roleType}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/5">
              <h2 className="text-xl font-semibold text-slate-200 mb-4">About</h2>
              <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                {member.bio}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
