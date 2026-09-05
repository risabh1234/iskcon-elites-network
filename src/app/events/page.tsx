"use client";

import { MapPin, ArrowRight, Globe, Users, Trophy } from "lucide-react";
import Link from "next/link";

import { useState, useEffect } from "react";
import AddEventModal from "./AddEventModal";
import EditEventModal from "./EditEventModal";
import { AnimatePresence } from "framer-motion";

type EventType = {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  description?: string;
  imageUrl?: string;
  isHighlighted?: boolean;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (e) {
      console.error("Failed to fetch events", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadEvents();

    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setCanCreate(data.role === 'ADMIN' || data.role === 'SUPERADMIN' || data.canCreateEvents);
        }
      })
      .catch(e => console.error(e));
  }, []);

  const handleEventAdded = () => {
    setIsModalOpen(false);
    loadEvents();
  };

  const handleEventEdited = () => {
    setEditingEvent(null);
    loadEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) loadEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const handleHighlightEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHighlighted: true })
      });
      if (res.ok) loadEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  const upcomingEvents = events.filter(e => new Date(e.date) >= now);
  const pastEvents = events.filter(e => new Date(e.date) < now).reverse(); // Show most recent past events first

  const displayedEvents = showPastEvents ? pastEvents : upcomingEvents;

  const highlightedEvent = events.find(e => e.isHighlighted) || upcomingEvents[0] || pastEvents[0] || null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-32 pb-0">
      
      {/* Header */}
      <div className="container mx-auto px-6 mb-16 text-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#0C1A30] mb-6">
          Community <span className="text-[#C5A059] italic">Events</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Connect, learn, and grow. Join our upcoming summits, mentorship bootcamps, and local chapter meetups happening globally.
        </p>
      </div>

      {/* Split Layout: Upcoming Events & Graphic */}
      <div className="container mx-auto px-6 mb-24">
        <div className="flex flex-col lg:flex-row gap-12 items-stretch">
          
          {/* Left: Upcoming Dates */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif font-bold text-[#0C1A30]">
                {showPastEvents ? "Past Events" : "Upcoming Dates"}
              </h2>
              {canCreate && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#D98A29] hover:bg-[#c47a22] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors"
                >
                  Add Event
                </button>
              )}
            </div>
            
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {displayedEvents.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-gray-500 font-medium">No {showPastEvents ? 'past' : 'upcoming'} events at the moment.</p>
                </div>
              ) : (
                displayedEvents.map((event) => {
                  const d = new Date(event.date);
                  const dateNum = d.getDate();
                  const monthName = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                  
                  return (
                    <div key={event.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-[#C5A059]/30 hover:shadow-md transition-all">
                      
                      {/* Date Box */}
                      <div className="bg-[#0C1A30] text-white rounded-xl p-4 min-w-[80px] text-center shrink-0 group-hover:bg-[#D98A29] transition-colors">
                        <div className="font-bold text-2xl leading-none mb-1">{dateNum}</div>
                        <div className="text-xs font-semibold tracking-widest">{monthName}</div>
                      </div>
                      
                      {/* Event Details */}
                      <div className="flex-1">
                        <h3 className="font-serif font-bold text-[#0C1A30] text-lg mb-2 group-hover:text-[#D98A29] transition-colors">
                          {event.title}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#C5A059]" /> {event.location}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-2 font-medium">
                          {event.time}
                        </div>
                      </div>
    
                      {/* Register Button / Admin Actions */}
                      <div className="hidden sm:flex shrink-0 items-center gap-2">
                        {canCreate && (
                          <>
                            <button
                              onClick={() => handleHighlightEvent(event.id)}
                              className={`p-2 rounded-md transition-colors ${event.isHighlighted ? 'text-[#D98A29] bg-[#D98A29]/10' : 'text-gray-400 hover:bg-gray-100 hover:text-[#0C1A30]'}`}
                              title={event.isHighlighted ? "Currently Highlighted" : "Highlight Event"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={event.isHighlighted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </button>
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-500 rounded-md transition-colors"
                              title="Edit Event"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
                              title="Delete Event"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </>
                        )}
                        <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 text-[#0C1A30] group-hover:bg-[#D98A29] group-hover:text-white group-hover:border-[#D98A29] transition-all ml-2">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setShowPastEvents(!showPastEvents)}
                className="inline-flex items-center gap-2 text-[#0C1A30] font-semibold hover:text-[#D98A29] transition-colors"
              >
                {showPastEvents ? "View upcoming events" : "View all past events"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Vibrant Graphic */}
          <div className="w-full lg:w-1/2 relative rounded-3xl overflow-hidden shadow-xl min-h-[400px]">
             {highlightedEvent ? (
               <>
                 <div className="absolute inset-0 bg-[#0C1A30]/30 z-10" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0C1A30]/90 via-[#0C1A30]/20 to-transparent z-10" />
                 <div 
                   className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                   style={{ backgroundImage: `url("${highlightedEvent.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1740&auto=format&fit=crop'}")` }}
                 />
                 <div className="absolute bottom-0 left-0 w-full p-10 z-20">
                   <span className="bg-[#D98A29] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Highlight</span>
                   <h3 className="text-3xl font-serif font-bold text-white mb-2">{highlightedEvent.title}</h3>
                   <p className="text-gray-200">{highlightedEvent.description || `${highlightedEvent.location} • ${new Date(highlightedEvent.date).toLocaleDateString()} at ${highlightedEvent.time}`}</p>
                 </div>
               </>
             ) : (
               <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                 <p className="text-gray-400">No events found.</p>
               </div>
             )}
          </div>
          
        </div>
      </div>

      {/* Global Presence Map Section */}
      <div className="bg-[#0C1A30] py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
          <Globe className="w-[1000px] h-[1000px] text-white stroke-[0.5]" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">Our Global Presence</h2>
            <p className="text-gray-400">The ISKCON Elite Network spans across continents, with thriving local chapters in major tech and business hubs worldwide.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <Users className="w-10 h-10 text-[#C5A059] mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-white mb-2">70+</h3>
              <p className="text-gray-400 font-medium">Countries</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <MapPin className="w-10 h-10 text-[#C5A059] mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-white mb-2">100+</h3>
              <p className="text-gray-400 font-medium">Cities</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <Trophy className="w-10 h-10 text-[#C5A059] mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-white mb-2">25+</h3>
              <p className="text-gray-400 font-medium">Regional Chapters</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <button className="bg-transparent border-2 border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0C1A30] px-8 py-3 rounded-full font-semibold transition-all">
              Find a Chapter Near You
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <AddEventModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={handleEventAdded} 
          />
        )}
        {editingEvent && (
          <EditEventModal
            event={editingEvent}
            onClose={() => setEditingEvent(null)}
            onSuccess={handleEventEdited}
          />
        )}
      </AnimatePresence>
      
    </div>
  );
}
