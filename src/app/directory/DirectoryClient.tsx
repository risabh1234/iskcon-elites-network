"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, GraduationCap, Mic, Plus, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AddEntryModal from "./AddEntryModal";
import EditEntryModal from "./EditEntryModal";

export type DirectoryMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  roleType: 'Alumni' | 'Speaker';
  primaryLabel: string;
  secondaryLabel: string;
  bio?: string;
  email?: string | null;
  story?: string | null;
  recommendation?: string | null;
  category?: string;
  cohort?: string;
  title?: string;
  isApproved?: boolean;
};

export default function DirectoryClient({ initialMembers, isAdmin }: { initialMembers: DirectoryMember[], isAdmin?: boolean }) {
  const { isSignedIn } = useUser();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<DirectoryMember | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, _roleType: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this profile?")) return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/directory/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting profile.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Derive unique categories dynamically
  const categories = ["All", "Alumni", "Speaker"];

  const filteredMembers = initialMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || member.roleType === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Hybrid Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search directory by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FDFBF7] border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-[#0C1A30] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D98A29] transition-shadow"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#FDFBF7] border border-gray-200 rounded-xl px-4 py-3 text-[#0C1A30] focus:outline-none focus:ring-2 focus:ring-[#D98A29] appearance-none min-w-[200px]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "All" ? "All Roles" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Directory Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <AnimatePresence>
            {filteredMembers.map((member) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={member.id}
              >
                <Link href={`/directory/${member.id}`} className="block h-full">
                  <div className="bg-white hover:bg-[#FDFBF7] border border-gray-100 hover:border-[#C5A059]/50 rounded-2xl p-6 transition-all h-full flex flex-col group shadow-sm hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium text-xl border-2 border-gray-100 group-hover:border-[#C5A059]/30 transition-colors overflow-hidden shrink-0 shadow-sm">
                        {member.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0C1A30]/5 border border-[#0C1A30]/10 text-[#0C1A30]">
                        {member.primaryLabel}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-[#0C1A30] mb-2 group-hover:text-[#D98A29] transition-colors flex items-center gap-2">
                      {member.name}
                      {isAdmin && !member.isApproved && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
                          Pending
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-auto pt-4 border-t border-gray-100">
                      {member.roleType === 'Alumni' ? (
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="truncate font-medium">{member.secondaryLabel}</span>

                      {isAdmin && (
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingMember(member);
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#0C1A30] bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 shadow-sm transition-all"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(member.id, member.roleType, e)}
                            disabled={isDeleting === member.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all disabled:opacity-50"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-24 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-lg">No records found matching your filters.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 md:bottom-8 right-6 md:right-8 bg-[#D98A29] text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:scale-105 hover:bg-[#c47a22] transition-all z-40 flex items-center justify-center group"
        title="Add Directory Entry"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Auth/Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddEntryModal
            isSignedIn={!!isSignedIn}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMember && (
          <EditEntryModal
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onSuccess={() => {
              setEditingMember(null);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
