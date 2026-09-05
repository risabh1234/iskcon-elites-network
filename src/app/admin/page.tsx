'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Trash2, Edit2 } from 'lucide-react';
import EditEntryModal from '../directory/EditEntryModal';
import { DirectoryMember } from '../directory/DirectoryClient';
import { AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('Alumni');
  const [fullName, setFullName] = useState('');
  const [cohort, setCohort] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Right Column data state
  type RecordType = { id: string; name: string; avatarUrl: string | null; cohort?: string; title?: string; bio?: string; email?: string | null; story?: string | null; recommendation?: string | null; category?: string; isApproved?: boolean };
  const [records, setRecords] = useState<{ alumni: RecordType[], speakers: RecordType[] }>({ alumni: [], speakers: [] });
  const [editingMember, setEditingMember] = useState<DirectoryMember | null>(null);

  // Admin / User Management State
  type UserType = { id: string; clerkId: string; email: string; username?: string; role: 'USER' | 'ADMIN' | 'SUPERADMIN'; canCreateEvents: boolean; createdAt: string };
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'users' | 'events'>('directory');
  
  // Deletion Modal State
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [deleteUsernameInput, setDeleteUsernameInput] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Events State
  type EventType = { id: string; title: string; location: string; date: string; time: string };
  const [events, setEvents] = useState<EventType[]>([]);

  const handleEdit = (record: RecordType, type: 'Alumni' | 'Speaker') => {
    const member: DirectoryMember = {
      id: record.id,
      name: record.name,
      avatarUrl: record.avatarUrl,
      roleType: type,
      primaryLabel: type === 'Alumni' ? record.cohort || '' : (record.title === 'Featured Guest' ? 'Guest' : 'Speaker'),
      secondaryLabel: type === 'Alumni' ? record.category || '' : record.title || '',
      bio: record.bio,
      email: record.email,
      story: record.story,
      recommendation: record.recommendation,
      category: record.category,
      cohort: record.cohort,
      title: record.title,
      isApproved: record.isApproved,
    };
    setEditingMember(member);
  };

  const handleApprove = async (id: string, category: 'alumni' | 'speaker') => {
    try {
      const res = await fetch(`/api/directory/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleType: category === 'alumni' ? 'Alumni' : 'Speaker',
          isApproved: true,
        })
      });
      // 204 No Content carries no body, so only parse when there is one.
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
      if (res.ok) {
        setRecords(prev => ({
          ...prev,
          [category === 'alumni' ? 'alumni' : 'speakers']: prev[category === 'alumni' ? 'alumni' : 'speakers'].map((item: RecordType) => 
            item.id === id ? { ...item, isApproved: true } : item
          )
        }));
      } else {
        alert(data.error || 'Failed to approve record');
      }
    } catch {
      alert('A network error occurred while approving');
    }
  };

  useEffect(() => {
    fetch('/api/directory?includeUnpublished=true')
      .then(async (res) => {
        try {
          return await res.json();
        } catch (e) {
          return { error: 'Failed to fetch directory' };
        }
      })
      .then(data => {
        // The API returns one flat list now; the console still shows the two
        // tables separately, so it is split here until Phase 6 rebuilds it.
        if (Array.isArray(data)) {
          setRecords({
            alumni: data.filter((m: RecordType & { roleType: string }) => m.roleType === 'Alumni'),
            speakers: data.filter((m: RecordType & { roleType: string }) => m.roleType === 'Speaker'),
          });
        }
      })
      .catch(err => console.error("Failed to fetch records:", err));
  }, [isPublishing, editingMember]); // Refresh after publishing or editing

  useEffect(() => {
    if (activeTab === 'users') {
      setIsLoadingUsers(true);
      fetch('/api/users')
        .then(async (res) => {
          try {
            return await res.json();
          } catch (e) {
            return { users: [] };
          }
        })
        .then(data => {
          setUsers(Array.isArray(data) ? data : []);
          setIsLoadingUsers(false);
        })
        .catch(err => {
          console.error("Failed to fetch users:", err);
          setIsLoadingUsers(false);
        });
    } else if (activeTab === 'events') {
      fetch('/api/events')
        .then(res => res.json())
        .then(data => setEvents(Array.isArray(data) ? data : []))
        .catch(err => console.error("Failed to fetch events:", err));
    }
  }, [activeTab]);

  const handleRoleChange = async (id: string, newRole: 'USER' | 'ADMIN' | 'SUPERADMIN') => {
    if (!confirm(`Are you sure you want to change this user to ${newRole}?`)) return;
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      } else {
        alert(data.error || 'Failed to update role');
      }
    } catch {
      alert('Network error while updating role');
    }
  };

  const promptDeleteUser = (user: UserType) => {
    setUserToDelete(user);
    setDeleteUsernameInput('');
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const expected = userToDelete.username || userToDelete.email;
    if (deleteUsernameInput !== expected) {
      alert("Name did not match. Deletion cancelled.");
      return;
    }
    
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch {
      alert('Network error while deleting user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleEventPermissionChange = async (id: string, canCreateEvents: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canCreateEvents })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, canCreateEvents } : u));
      } else {
        alert(data.error || 'Failed to update permissions');
      }
    } catch {
      alert('Network error while updating permissions');
    }
  };

  const handleEventDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setEvents(events.filter(e => e.id !== id));
      } else {
        alert(data.error || 'Failed to delete event');
      }
    } catch {
      alert('Network error while deleting event');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      // 204 No Content carries no body, so only parse when there is one.
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
      if (data.url) setImageUrl(data.url);
    } catch (err) {
      console.error("Upload interface error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const res = await fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          category,
          profileImage: imageUrl,
          cohort: category === 'Alumni' ? cohort : undefined,
          title: category === 'Speaker' ? title : undefined,
          bio
        })
      });

      // 204 No Content carries no body, so only parse when there is one.
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));

      if (res.ok) {
        setStatusMsg({ text: 'Entry published successfully!', type: 'success' });
        // Reset form
        setFullName('');
        setCohort('');
        setTitle('');
        setBio('');
        setImageUrl('');
      } else {
        setStatusMsg({ text: data.error || 'Failed to publish entry', type: 'error' });
      }
    } catch {
      setStatusMsg({ text: 'A network error occurred', type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: string, category: 'alumni' | 'speaker') => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const res = await fetch(`/api/directory/${id}`, {
        method: 'DELETE',
      });
      // 204 No Content carries no body, so only parse when there is one.
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
      if (res.ok) {
        // Trigger a re-fetch
        setRecords(prev => ({
          ...prev,
          [category === 'alumni' ? 'alumni' : 'speakers']: prev[category === 'alumni' ? 'alumni' : 'speakers'].filter((item: RecordType) => item.id !== id)
        }));
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch {
      alert('A network error occurred while deleting');
    }
  };

  const totalRecords = (records.alumni?.length || 0) + (records.speakers?.length || 0);

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white selection:bg-white/20">
      {/* Premium Subdued Navigation */}
      <header className="border-b border-white/10 bg-[#0B0C10]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono tracking-wider text-xs uppercase bg-white/5 border border-white/10 text-white px-3 py-1 rounded-full">Studio</span>
            <h1 className="text-sm font-medium tracking-tight text-zinc-300">Platform Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-4">
        <div className="flex items-center gap-6 border-b border-white/10">
          <button 
            onClick={() => setActiveTab('directory')}
            className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'directory' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Directory Records
            {activeTab === 'directory' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45F3FF]" />}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            User Management
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45F3FF]" />}
          </button>
          <button 
            onClick={() => setActiveTab('events')}
            className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'events' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Events
            {activeTab === 'events' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45F3FF]" />}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {activeTab === 'directory' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {/* Left Column: Input Panel */}
        <section className="md:col-span-1 bg-[#12141C] border border-white/10 rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-base font-semibold mb-6 tracking-tight text-white">Create Directory Entry</h2>

          <form className="space-y-5" onSubmit={handlePublish}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#45F3FF] bg-black/40 text-white transition-colors" placeholder="e.g., Jane Doe" />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#45F3FF] bg-black/40 text-white transition-colors">
                <option>Alumni</option>
                <option>Speaker</option>
                <option>Featured Guest</option>
              </select>
            </div>

            {category === 'Alumni' && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">Cohort</label>
                <input type="text" value={cohort} onChange={e => setCohort(e.target.value)} required className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#45F3FF] bg-black/40 text-white transition-colors" placeholder="e.g., Class of 2024" />
              </div>
            )}

            {category === 'Speaker' && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">Title / Organization</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#45F3FF] bg-black/40 text-white transition-colors" placeholder="e.g., Sr. Engineer at TechCorp" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} required rows={4} className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#45F3FF] bg-black/40 text-white transition-colors" placeholder="Professional biography..." />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">Profile Image</label>
              <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:bg-white/5 transition-colors relative cursor-pointer">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading || isPublishing} />
                <p className="text-xs text-zinc-500">{isUploading ? "Uploading to Cloudflare..." : "Drag & drop or click to upload"}</p>
              </div>
              {imageUrl && (
                <div className="mt-3 text-xs text-emerald-400 font-mono break-all p-2 bg-emerald-950/30 rounded border border-emerald-900">
                  ✓ Uploaded: {imageUrl}
                </div>
              )}
            </div>

            <button type="submit" disabled={isPublishing} className="w-full py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors mt-2 shadow-sm disabled:opacity-50">
              {isPublishing ? 'Publishing...' : 'Publish Entry'}
            </button>

            {statusMsg.text && (
              <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${statusMsg.type === 'success' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900' : 'bg-red-950/30 text-red-400 border border-red-900'}`}>
                {statusMsg.text}
              </div>
            )}
          </form>
        </section>

        {/* Right Column: Database Records Grid View */}
        <section className="md:col-span-2 bg-[#12141C] border border-white/10 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold tracking-tight text-white">Active Directory Records</h2>
            <span className="text-xs font-mono text-zinc-500">Total: {totalRecords} records</span>
          </div>

          {totalRecords === 0 ? (
            <div className="border border-white/10 rounded-lg p-12 text-center bg-black/40">
              <p className="text-sm text-zinc-500 font-normal">No entries populated yet. Use the creation panel to write to the Supabase database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.alumni?.map((alumnus: RecordType) => (
                <div key={alumnus.id} className="border border-white/5 bg-white/5 rounded-lg p-4 flex items-start gap-4 hover:border-white/20 transition-colors">
                  {alumnus.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={alumnus.avatarUrl} alt={alumnus.name} className="w-12 h-12 rounded-full object-cover bg-black border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center text-zinc-500 font-bold text-sm">
                      {alumnus.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-white">{alumnus.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{alumnus.cohort} • Alumni</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {!alumnus.isApproved && (
                      <button
                        onClick={() => handleApprove(alumnus.id, 'alumni')}
                        className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-md transition-colors font-semibold text-xs border border-emerald-500/20"
                        title="Approve Record"
                      >
                        APPROVE
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(alumnus, 'Alumni')}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      title="Edit Record"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(alumnus.id, 'alumni')}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {records.speakers?.map((speaker: RecordType) => (
                <div key={speaker.id} className="border border-white/5 bg-white/5 rounded-lg p-4 flex items-start gap-4 hover:border-white/20 transition-colors">
                  {speaker.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={speaker.avatarUrl} alt={speaker.name} className="w-12 h-12 rounded-full object-cover bg-black border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center text-zinc-500 font-bold text-sm">
                      {speaker.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-white">{speaker.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{speaker.title} • Speaker</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {!speaker.isApproved && (
                      <button
                        onClick={() => handleApprove(speaker.id, 'speaker')}
                        className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-md transition-colors font-semibold text-xs border border-emerald-500/20"
                        title="Approve Record"
                      >
                        APPROVE
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(speaker, 'Speaker')}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      title="Edit Record"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(speaker.id, 'speaker')}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </div>
        ) : activeTab === 'users' ? (
          <section className="bg-[#12141C] border border-white/10 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight text-white mb-6">Registered Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-[#C5C6C7] text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium px-4">User</th>
                    <th className="pb-3 font-medium px-4">Clerk ID</th>
                    <th className="pb-3 font-medium px-4">Role</th>
                    <th className="pb-3 font-medium px-4">Event Perms</th>
                    <th className="pb-3 font-medium px-4">Joined</th>
                    <th className="pb-3 font-medium px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white">
                        <div className="font-medium">{user.username || 'Unknown'}</div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-xs">{user.clerkId.substring(0, 12)}...</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'SUPERADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          user.role === 'ADMIN' ? 'bg-[#45F3FF]/10 text-[#45F3FF] border border-[#45F3FF]/20' :
                          'bg-zinc-800 text-zinc-400 border border-white/10'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => handleEventPermissionChange(user.id, !user.canCreateEvents)}
                          className={`relative flex items-center cursor-pointer w-10 h-6 rounded-full transition-colors focus:outline-none ${user.canCreateEvents ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                          title={user.canCreateEvents ? 'Revoke Event Permissions' : 'Grant Event Permissions'}
                        >
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${user.canCreateEvents ? 'transform translate-x-4' : ''}`}></div>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right flex justify-end items-center gap-2">
                        {user.role === 'USER' && (
                          <button 
                            onClick={() => handleRoleChange(user.id, 'ADMIN')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[#45F3FF]/10 text-[#45F3FF] hover:bg-[#45F3FF]/20 transition-colors"
                          >
                            Make Admin
                          </button>
                        )}
                        {user.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleRoleChange(user.id, 'USER')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Revoke Admin
                          </button>
                        )}
                        {user.role !== 'SUPERADMIN' && (
                          <button
                            onClick={() => promptDeleteUser(user)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        No users found, or you do not have permission to view them.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="bg-[#12141C] border border-white/10 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight text-white mb-6">Published Events</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-[#C5C6C7] text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium px-4">Title</th>
                    <th className="pb-3 font-medium px-4">Location</th>
                    <th className="pb-3 font-medium px-4">Date</th>
                    <th className="pb-3 font-medium px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{event.title}</td>
                      <td className="py-3 px-4 text-zinc-400">{event.location}</td>
                      <td className="py-3 px-4 text-zinc-400">{new Date(event.date).toLocaleDateString()} at {event.time}</td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => handleEventDelete(event.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-500">
                        No events found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMember && (
          <EditEntryModal
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onSuccess={() => {
              setEditingMember(null);
              // useEffect will trigger re-fetch because editingMember changes
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div 
              className="bg-[#12141C] border border-red-500/20 rounded-xl p-6 shadow-2xl max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Delete User</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to delete <span className="font-bold text-white">{userToDelete.email}</span>? This action cannot be undone.
              </p>
              
              <div className="mb-6">
                <label className="block text-xs font-medium uppercase tracking-wider text-[#C5C6C7] mb-1.5">
                  Type <strong>{userToDelete.username || userToDelete.email}</strong> to confirm
                </label>
                <input 
                  type="text" 
                  value={deleteUsernameInput} 
                  onChange={e => setDeleteUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-black/40 text-white transition-colors"
                  placeholder={userToDelete.username || userToDelete.email}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  disabled={isDeletingUser}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteUser}
                  disabled={deleteUsernameInput !== (userToDelete.username || userToDelete.email) || isDeletingUser}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isDeletingUser ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
