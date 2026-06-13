import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, User, Phone, Mail, LayoutDashboard, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Meeting {
  id: string;
  name: string;
  mobile: string;
  email: string;
  date: string;
  time: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  meetLink?: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) {
        const data = await res.json();
        // Sort by date/time (newest upcoming first)
        data.sort((a: Meeting, b: Meeting) => {
          const datetimeA = new Date(`${a.date}T${a.time}`);
          const datetimeB = new Date(`${b.date}T${b.time}`);
          return datetimeA.getTime() - datetimeB.getTime();
        });
        setMeetings(data);
      }
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const filteredMeetings = filterDate 
    ? meetings.filter(m => m.date === filterDate)
    : meetings;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-slate-900 py-4 px-6 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-white" size={24} />
          <h1 className="text-xl font-semibold text-white tracking-tight">SRK MEET Admin</h1>
        </div>
        <Link 
          to="/" 
          className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
        >
          View Public Form
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Scheduled Meetings</h2>
            <p className="text-slate-500 mt-1">Manage and view your upcoming client appointments.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-3 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
              />
              {filterDate && (
                <button 
                  onClick={() => setFilterDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
            <button 
              onClick={fetchMeetings}
              className="text-sm font-medium text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center"
          >
            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No meetings found</h3>
            <p className="text-slate-500">
              {filterDate ? `No meetings scheduled for ${new Date(filterDate).toLocaleDateString()}.` : 'When clients schedule meetings, they will appear here.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center text-slate-900 font-medium">
                      <Calendar size={16} className="mr-2 text-slate-500" />
                      {new Date(meeting.date).toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center text-slate-900 font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-sm">
                      <Clock size={14} className="mr-1.5" />
                      {meeting.time}
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg text-slate-900 leading-tight">
                      {meeting.name}
                    </h3>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center text-slate-600 text-sm">
                      <Phone size={16} className="mr-3 text-slate-400 shrink-0" />
                      <a href={`tel:${meeting.mobile}`} className="hover:text-slate-900 transition-colors">
                        {meeting.mobile}
                      </a>
                    </div>
                    
                    {meeting.email && (
                      <div className="flex items-center text-slate-600 text-sm">
                        <Mail size={16} className="mr-3 text-slate-400 shrink-0" />
                        <a href={`mailto:${meeting.email}`} className="hover:text-slate-900 transition-colors truncate">
                          {meeting.email}
                        </a>
                      </div>
                    )}
                    
                    {meeting.meetLink && (
                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Meeting Link</span>
                        <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all">
                          {meeting.meetLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-white border-t border-slate-100">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                  <select 
                    value={meeting.status || 'scheduled'}
                    onChange={(e) => updateStatus(meeting.id, e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md py-1.5 px-2 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="px-5 py-3 bg-slate-50 text-xs text-slate-400 border-t border-slate-100 flex justify-between">
                  <span>ID: {meeting.id}</span>
                  <span>Booked: {new Date(meeting.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
