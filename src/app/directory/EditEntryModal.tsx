'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UploadCloud } from 'lucide-react';
import { DirectoryMember } from './DirectoryClient';

type EditEntryModalProps = {
  member: DirectoryMember;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditEntryModal({ member, onClose, onSuccess }: EditEntryModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState(member.avatarUrl || '');
  
  const [fullName, setFullName] = useState(member.name);
  const [category, setCategory] = useState(member.category || 'Alumni');
  const [cohort, setCohort] = useState(member.cohort || '');
  const [title, setTitle] = useState(member.title || '');
  const [bio, setBio] = useState(member.bio || '');
  const [story, setStory] = useState(member.story || '');
  const [recommendation, setRecommendation] = useState(member.recommendation || '');
  const [email, setEmail] = useState(member.email || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
    } catch (err) {
      console.error('Upload interface error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/directory/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleType: member.roleType,
          fullName,
          category,
          profileImage: imageUrl,
          cohort: member.roleType === 'Alumni' ? cohort : undefined,
          title: member.roleType === 'Speaker' ? title : undefined,
          bio,
          story,
          recommendation,
          email: email || undefined,
        }),
      });

      // 204 No Content carries no body, so only parse when there is one.
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));

      if (res.ok) {
        onSuccess();
      } else {
        setErrorMsg(data.error || 'Failed to update entry');
      }
    } catch {
      setErrorMsg('A network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl my-8 bg-[#12141C] border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white tracking-tight">Edit Directory Entry</h2>
            <p className="text-zinc-400 text-sm mt-1">Make changes to this profile below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="e.g., Jane Doe" />
              </div>

              {/* Category */}
              {member.roleType === 'Alumni' && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Role Type</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm">
                    <option>Alumni</option>
                    <option>Speaker</option>
                  </select>
                </div>
              )}

              {/* Dynamic Field: Cohort / Title */}
              {member.roleType === 'Alumni' ? (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Cohort</label>
                  <input type="text" value={cohort} onChange={e => setCohort(e.target.value)} required className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="e.g., Class of 2024" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Profession / Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="e.g., Software Engineer" />
                </div>
              )}

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Contact Email <span className="text-zinc-600 lowercase">(Optional)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="hello@example.com" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Professional Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} required rows={3} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="Brief professional biography..." />
            </div>

            {/* Story (Alumni Only) */}
            {member.roleType === 'Alumni' && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">How did you come to Krishna Consciousness?</label>
                <textarea value={story} onChange={e => setStory(e.target.value)} required rows={3} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="Share your journey..." />
              </div>
            )}

            {/* Recommendation (Alumni Only) */}
            {member.roleType === 'Alumni' && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Your POV on Krishna consciousness</label>
                <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} required rows={3} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-black/40 text-white transition-all shadow-sm" placeholder="Advice, books, practices..." />
              </div>
            )}

            {/* Profile Image */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">Profile Photo</label>
              <div className="border border-dashed border-white/20 rounded-lg p-6 text-center hover:bg-white/5 transition-colors relative cursor-pointer flex flex-col items-center justify-center gap-2">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading || isSubmitting} />
                <UploadCloud className="w-6 h-6 text-zinc-500" />
                <p className="text-xs text-zinc-500">
                  {isUploading ? 'Uploading...' : 'Drag & drop or click to upload new photo'}
                </p>
              </div>
              {imageUrl && (
                <div className="mt-2 text-xs text-emerald-400 font-mono break-all p-2 bg-emerald-950/30 rounded border border-emerald-900 flex items-center justify-between">
                  <span>✓ Photo present</span>
                  <img src={imageUrl} alt="Profile preview" className="h-6 w-6 rounded-full object-cover" />
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg text-sm font-medium bg-red-950/30 text-red-400 border border-red-900">
                {errorMsg}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
