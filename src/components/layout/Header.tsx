"use client";

import { useState, useEffect } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type HeaderUser = { name: string | null; email: string };

export default function Header({ user }: { user: HeaderUser | null }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = pathname === "/";
  const headerBg = scrolled ? "bg-[#0C1A30]/95 backdrop-blur-md shadow-md" : (isHome ? "bg-transparent" : "bg-[#0C1A30]");

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 w-full z-50 border-b border-white/10 transition-colors duration-300 ${headerBg}`}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between relative">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-[#C5A059]/10 rounded-lg border border-[#C5A059]/20 group-hover:bg-[#C5A059]/20 transition-colors">
            <GraduationCap className="w-6 h-6 text-[#C5A059]" />
          </div>
          <span className="font-semibold text-xl tracking-tight text-white font-serif">
            ISKCON <span className="text-[#C5A059]">ELITE</span>
          </span>
        </Link>

        <nav className="hidden lg:flex gap-8 text-sm font-medium text-gray-300 absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="hover:text-white transition-colors duration-300">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors duration-300">About</Link>
          <Link href="/directory" className="hover:text-white transition-colors duration-300">Members</Link>
          <Link href="/success-stories" className="hover:text-white transition-colors duration-300">Success Stories</Link>
          <Link href="/mentorship" className="hover:text-white transition-colors duration-300">Mentorship</Link>
          <Link href="/events" className="hover:text-white transition-colors duration-300">Events</Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {!user && (
              <div className="flex items-center gap-3">
                <Link href="/sign-in" className="px-5 py-2.5 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors">
                  Login
                </Link>
                <Link href="/sign-up" className="px-5 py-2.5 text-sm font-semibold bg-[#D98A29] text-white rounded-full hover:bg-[#c47a22] transition-colors shadow-lg">
                  Join Elite
                </Link>
              </div>
            )}
            {user && <UserMenu name={user.name} email={user.email} />}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center gap-4">
            {user && <UserMenu name={user.name} email={user.email} compact />}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-white hover:text-[#C5A059] bg-white/5 rounded-lg border border-white/10 transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 w-full min-h-screen z-[100] bg-[#0C1A30] flex flex-col"
          >
            {/* Absolute Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 p-2 text-white bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-colors z-50"
              aria-label="Close Menu"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Nav Links */}
            <nav className="flex flex-col items-center justify-center space-y-8 h-full px-6 text-2xl font-serif text-white">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A059] transition-colors">Home</Link>
              <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A059] transition-colors">About</Link>
              <Link href="/directory" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A059] transition-colors">Members</Link>
              <Link href="/success-stories" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A059] transition-colors">Success Stories</Link>
              <Link href="/mentorship" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A059] transition-colors">Mentorship</Link>
              <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A059] transition-colors">Events</Link>
            </nav>

            {/* Auth Buttons */}
            <div className="mt-auto flex flex-col gap-4 px-6 pb-12">
              {!user && (
                <>
                  <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center text-lg font-medium text-white border border-white/20 rounded-2xl hover:bg-white/5 transition-colors">
                    Login
                  </Link>
                  <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center text-lg font-medium bg-[#D98A29] text-white rounded-2xl shadow-lg">
                    Join Elite
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

