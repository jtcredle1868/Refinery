import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listManuscripts } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FileText, Upload, ChevronRight, BookOpen, Star } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listManuscripts()
      .then((res) => setManuscripts(res.data.manuscripts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors = {
    uploaded: 'bg-yellow-100 text-yellow-800',
    parsing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    analyzing: 'bg-purple-100 text-purple-800',
    analyzed: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-refinery-navy">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-refinery-slate mt-1">
          Your manuscript analysis dashboard
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Manuscripts</p>
              <p className="text-3xl font-bold text-refinery-navy mt-1">{manuscripts.length}</p>
            </div>
            <FileText className="h-10 w-10 text-refinery-light-blue" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Words</p>
              <p className="text-3xl font-bold text-refinery-navy mt-1">
                {manuscripts.reduce((sum, m) => sum + m.word_count, 0).toLocaleString()}
              </p>
            </div>
            <BookOpen className="h-10 w-10 text-refinery-light-blue" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Current Tier</p>
              <p className="text-3xl font-bold text-refinery-navy mt-1 uppercase">{user?.tier || 'Free'}</p>
            </div>
            <Star className="h-10 w-10 text-refinery-gold" />
          </div>
        </div>
      </div>

      {/* Manuscripts list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-refinery-navy">Your Manuscripts</h2>
          <Link
            to="/upload"
            className="flex items-center space-x-1 bg-refinery-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Upload className="h-4 w-4" />
            <span>Upload New</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-refinery-blue mx-auto"></div>
            <p className="mt-3 text-slate-500">Loading manuscripts...</p>
          </div>
        ) : manuscripts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No manuscripts yet</h3>
            <p className="text-slate-400 mt-1 mb-4">Upload your first manuscript to get started</p>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 bg-refinery-blue text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Manuscript</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {manuscripts.map((m) => (
              <Link
                key={m.id}
                to={`/manuscript/${m.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-refinery-slate" />
                  <div>
                    <h3 className="font-medium text-refinery-navy">{m.title}</h3>
                    <p className="text-sm text-slate-400">
                      {m.word_count.toLocaleString()} words &middot; {m.chapter_count} chapters &middot; .{m.file_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[m.status] || 'bg-slate-100 text-slate-600'}`}>
                    {m.status}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
