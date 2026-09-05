import { ShieldAlert } from "lucide-react";

import { getActor } from "@/server/auth";
import { can } from "@/server/policy";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();

  if (actor.kind !== 'user') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white relative overflow-hidden min-h-[70vh]">
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 to-white opacity-80 pointer-events-none"></div>
        
        {/* Gold particle accents in top-left */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-400 rounded-full blur-sm opacity-50 pointer-events-none"></div>
        <div className="absolute top-24 left-20 w-2 h-2 bg-yellow-600 rounded-full blur-[1px] opacity-40 pointer-events-none"></div>
        <div className="absolute top-16 left-32 w-3 h-3 bg-yellow-300 rounded-full blur-sm opacity-60 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
            <ShieldAlert className="w-24 h-24 text-red-500 relative drop-shadow-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-serif">401 Unauthorized</h1>
          <p className="text-slate-500 max-w-2xl text-lg md:text-xl text-center leading-relaxed mb-10">
            You must be logged in to access the administrative portal. Please return to the homepage to sign in.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center justify-center px-8 py-3 bg-slate-900 text-white font-medium rounded-lg border-2 border-yellow-600 transition-all duration-300 hover:-translate-y-1 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-600/20"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  if (!can(actor, 'admin:access')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white relative overflow-hidden min-h-[70vh]">
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 to-white opacity-80 pointer-events-none"></div>
        
        {/* Gold particle accents in top-left */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-400 rounded-full blur-sm opacity-50 pointer-events-none"></div>
        <div className="absolute top-24 left-20 w-2 h-2 bg-yellow-600 rounded-full blur-[1px] opacity-40 pointer-events-none"></div>
        <div className="absolute top-16 left-32 w-3 h-3 bg-yellow-300 rounded-full blur-sm opacity-60 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
            <ShieldAlert className="w-24 h-24 text-red-500 relative drop-shadow-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-serif">403 Forbidden</h1>
          <p className="text-slate-500 max-w-2xl text-lg md:text-xl text-center leading-relaxed mb-10">
            You do not possess the required privileges to access the administrative portal. This incident has been logged.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center justify-center px-8 py-3 bg-slate-900 text-white font-medium rounded-lg border-2 border-yellow-600 transition-all duration-300 hover:-translate-y-1 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-600/20"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pt-20">
      {/* Admin Sub-navigation could go here */}
      <div className="bg-slate-900 border-b border-white/5 py-4">
        <div className="container mx-auto px-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
            Command Center
          </h2>
        </div>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
