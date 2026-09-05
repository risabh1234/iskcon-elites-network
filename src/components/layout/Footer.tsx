import { GraduationCap, Mail } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative bg-[#0C1A30] pt-24 pb-12 mt-auto overflow-hidden text-gray-300">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Brand & Connect */}
          <div className="space-y-6 flex flex-col">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 bg-[#C5A059]/10 rounded-lg border border-[#C5A059]/20">
                <GraduationCap className="w-8 h-8 text-[#C5A059]" />
              </div>
              <span className="font-semibold text-2xl tracking-tight text-white font-serif">
                ISKCON <span className="text-[#C5A059]">ELITE</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Connecting accomplished professionals and leaders globally through spiritual wisdom and professional excellence.
            </p>
            <div className="flex gap-4 pt-4">
              <a href="#" aria-label="Facebook" className="p-2 bg-white/5 rounded-full hover:bg-[#C5A059]/20 hover:text-[#C5A059] transition-colors">
                <svg aria-hidden className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.597 0 0 .597 0 1.325v21.351C0 23.403.597 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.597 1.323-1.324V1.325C24 .597 23.403 0 22.675 0z" /></svg>
              </a>
              <a href="#" aria-label="X" className="p-2 bg-white/5 rounded-full hover:bg-[#C5A059]/20 hover:text-[#C5A059] transition-colors">
                <svg aria-hidden className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="p-2 bg-white/5 rounded-full hover:bg-[#C5A059]/20 hover:text-[#C5A059] transition-colors">
                <svg aria-hidden className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="#" aria-label="Instagram" className="p-2 bg-white/5 rounded-full hover:bg-[#C5A059]/20 hover:text-[#C5A059] transition-colors">
                <svg aria-hidden className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-white mb-6 text-lg">Quick Links</h3>
            <ul className="space-y-4 text-sm">
              <li><Link href="/" className="hover:text-[#C5A059] transition-colors duration-300">Home</Link></li>
              <li><Link href="/about" className="hover:text-[#C5A059] transition-colors duration-300">About Us</Link></li>
              <li><Link href="/directory" className="hover:text-[#C5A059] transition-colors duration-300">Members Directory</Link></li>
              <li><Link href="/events" className="hover:text-[#C5A059] transition-colors duration-300">Upcoming Events</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-serif text-white mb-6 text-lg">Resources</h3>
            <ul className="space-y-4 text-sm">
              <li><Link href="/success-stories" className="hover:text-[#C5A059] transition-colors duration-300">Success Stories</Link></li>
              <li><Link href="/mentorship" className="hover:text-[#C5A059] transition-colors duration-300">Mentorship Hub</Link></li>
              <li><Link href="#" className="hover:text-[#C5A059] transition-colors duration-300">Knowledge Centre</Link></li>
              <li><Link href="#" className="hover:text-[#C5A059] transition-colors duration-300">Guidelines</Link></li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h3 className="font-serif text-white mb-6 text-lg">Stay Updated</h3>
            <p className="text-sm text-gray-400 mb-4">Subscribe to our newsletter for the latest updates and elite network insights.</p>
            <form className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                />
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              </div>
              <button className="w-full bg-accent hover:bg-accent-hover text-accent-ink font-semibold py-3 rounded-xl transition-colors shadow-lg">
                Subscribe
              </button>
            </form>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#9AA3B2]">
          <p>© 2026 ISKCON Elites Network. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <span>Phone: +91 63705 07337</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
