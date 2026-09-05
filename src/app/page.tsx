"use client";

import { motion } from "framer-motion";
import { ArrowRight, Globe, Briefcase, BookOpen, Heart, Building, Scale, Lightbulb, MapPin, Quote } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [featuredProfiles, setFeaturedProfiles] = useState<any[]>([
    // Fallback data while loading or if empty
    { name: "Dr. Arvind Ramesh", title: "Senior Scientist, ISRO", country: "India", quote: "Balancing space exploration with inner exploration." },
    { name: "Priya Sharma, IAS", title: "District Magistrate", country: "India", quote: "Service to humanity is the highest devotion." },
    { name: "David Chen", title: "VP of Engineering, Google", country: "USA", quote: "Applying ancient wisdom to modern tech leadership." }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/directory')
      .then(res => res.json())
      .then(data => {
        // The API now returns a flat, already-filtered list of published
        // members. It no longer ships unapproved rows for the client to hide.
        const combined = Array.isArray(data) ? data : [];

        if (combined.length > 0) {
          const formattedProfiles = combined.slice(0, 7).map((p: any) => ({
            name: p.name || 'Anonymous Member',
            title: p.cohort ? `Alumni (${p.cohort})` : (p.title || 'Professional Member'),
            country: 'Global', // Placeholder as country is not in schema
            quote: p.recommendation ? (p.recommendation.length > 80 ? p.recommendation.substring(0, 80) + '...' : p.recommendation) : (p.bio ? (p.bio.length > 80 ? p.bio.substring(0, 80) + '...' : p.bio) : 'Committed to excellence and devotion.'),
            avatarUrl: p.avatarUrl
          }));
          setFeaturedProfiles(formattedProfiles);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch featured profiles", err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-screen md:h-[90vh] md:min-h-[600px] flex items-center justify-center pt-24 md:pt-28 bg-[#0C1A30] overflow-hidden">
        {/* Placeholder for Cinematic Background */}
        <div className="absolute inset-0 bg-[#0C1A30]/80 z-10" />
        <div
          className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1577985043696-8bd54d9f093f?q=80&w=2000&auto=format&fit=crop")' }}
        />

        <div className="container mx-auto px-6 relative z-20 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6 px-4 py-1.5 rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10 text-xs font-semibold uppercase tracking-widest text-[#C5A059]"
          >
            Connecting The Global Community
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight text-white font-serif max-w-4xl"
          >
            Where Spiritual Wisdom Meets <span className="text-[#C5A059] italic">Professional Excellence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-10 leading-relaxed font-sans"
          >
            A premier networking platform connecting accomplished professionals, visionaries, and leaders driven by devotion and higher purpose.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
          >
            <Link
              href="/sign-up"
              className="bg-[#D98A29] hover:bg-[#c47a22] text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto text-center"
            >
              Join ISKCON Elite
            </Link>
            <Link
              href="/success-stories"
              className="group flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all duration-300 w-full sm:w-auto"
            >
              Explore Stories
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS RIBBON */}
      <section className="bg-[#FDFBF7] py-12 border-b border-gray-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center divide-x divide-gray-200/60">
            {[
              { label: "Elite Members", value: "2500+" },
              { label: "Countries", value: "70+" },
              { label: "Professions", value: "150+" },
              { label: "Success Stories", value: "600+" },
              { label: "Mentors", value: "400+" },
              { label: "Organisations", value: "200+" }
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center">
                <span className="text-3xl font-serif font-bold text-[#0C1A30] mb-1">{stat.value}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURED PROFESSIONALS */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#0C1A30] mb-4">Featured Professionals</h2>
              <p className="text-gray-600 max-w-2xl">Discover inspiring leaders integrating their values with extraordinary career achievements.</p>
            </div>
            <Link href="/directory" className="hidden md:flex items-center gap-2 text-[#D98A29] font-semibold hover:text-[#c47a22] transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative overflow-hidden w-full group py-4">
            {/* Gradient masks for smooth fade at edges */}
            <div className="absolute top-0 left-0 w-8 md:w-32 h-full bg-gradient-to-r from-[#FDFBF7] to-transparent z-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-8 md:w-32 h-full bg-gradient-to-l from-[#FDFBF7] to-transparent z-20 pointer-events-none"></div>

            <div className="flex gap-8 w-max animate-marquee">
              {/* Duplicate the array multiple times to ensure seamless infinite scroll */}
              {[...featuredProfiles, ...featuredProfiles, ...featuredProfiles, ...featuredProfiles].map((profile, i) => (
                <div key={i} className="w-[320px] md:w-[400px] shrink-0 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C5A059]/10 to-transparent rounded-bl-full z-0" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden border-2 border-[#FDFBF7] shadow-sm relative flex items-center justify-center shrink-0">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl text-gray-500 font-bold">{profile.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-serif font-bold text-lg text-[#0C1A30] hover:text-[#D98A29] transition-colors truncate">{profile.name}</h3>
                        <p className="text-sm font-medium text-gray-500 truncate">{profile.title}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{profile.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#FDFBF7] p-4 rounded-xl border border-gray-100 relative min-h-[80px]">
                      <Quote className="absolute top-2 right-2 w-4 h-4 text-[#C5A059]/20" />
                      <p className="text-gray-600 text-sm italic pr-4">&quot;{profile.quote}&quot;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. EXPLORE BY PROFESSION */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#0C1A30] mb-4">Explore by Profession</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Connect with peers and mentors across diverse industry sectors worldwide.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Building, label: "Government" },
              { icon: Scale, label: "Judiciary" },
              { icon: Briefcase, label: "Business" },
              { icon: Lightbulb, label: "Technology" },
              { icon: Heart, label: "Healthcare" },
              { icon: BookOpen, label: "Education" },
            ].map((prof, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-8 bg-[#FDFBF7] rounded-2xl border border-gray-100 hover:border-[#C5A059]/30 hover:bg-[#C5A059]/5 transition-all cursor-pointer group">
                <prof.icon className="w-8 h-8 text-[#0C1A30] group-hover:text-[#D98A29] mb-4 transition-colors stroke-[1.5]" />
                <span className="font-semibold text-sm text-[#0C1A30]">{prof.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. GLOBAL COMMUNITY CTA */}
      <section className="py-24 bg-[#0C1A30] relative overflow-hidden">
        {/* Abstract World Map Graphic Placeholder */}
        <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
          <Globe className="w-[800px] h-[800px] text-white" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">Join Our Global Network</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
            Be part of a thriving community of professionals dedicated to making a positive impact in the world while staying rooted in spiritual values.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 bg-[#D98A29] hover:bg-[#c47a22] text-white px-10 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-lg"
          >
            Become a Member Today
          </Link>
        </div>
      </section>
    </div>
  );
}
