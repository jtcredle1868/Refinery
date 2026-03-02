import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listManuscripts } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

  const statusLabels = {
    uploaded: 'Uploaded',
    parsing: 'Parsing',
    ready: 'Ready',
    analyzing: 'Analyzing',
    analyzed: 'Analyzed',
    error: 'Error',
  };

  return (
    <section className="space-y-6">
      {/* Welcome header */}
      <header>
        <p className="text-sm uppercase tracking-[0.4em] text-ink/60">Dashboard</p>
        <h1 className="font-display text-3xl text-ink">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-ink/70">Your manuscript analysis control room.</p>
      </header>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-ink/10 bg-white/90 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-ink/50">Manuscripts</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{manuscripts.length}</p>
        </article>
        <article className="rounded-3xl border border-ink/10 bg-white/90 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-ink/50">Total words</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {manuscripts.reduce((sum, m) => sum + m.word_count, 0).toLocaleString()}
          </p>
        </article>
        <article className="rounded-3xl border border-ink/10 bg-white/90 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-ink/50">Current tier</p>
          <p className="mt-2 text-3xl font-semibold text-ink uppercase">{user?.tier || 'Free'}</p>
        </article>
      </div>

      {/* Manuscripts list */}
      <section className="rounded-3xl border border-ink/10 bg-white/90">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="font-semibold text-ink">Your Manuscripts</h2>
          <Link
            to="/upload"
            className="rounded-full bg-ink px-5 py-2 text-sm font-semibold uppercase tracking-wider text-parchment"
          >
            Upload new
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-plum mx-auto"></div>
            <p className="mt-3 text-ink/60">Gathering your manuscripts…</p>
          </div>
        ) : manuscripts.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-ink">No manuscripts yet</h3>
            <p className="text-ink/60 mt-1 mb-4">Upload your first manuscript to get started.</p>
            <Link
              to="/upload"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-wider text-parchment"
            >
              Upload Manuscript
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink/5">
            {manuscripts.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/manuscript/${m.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-ink/[0.03] transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-ink">{m.title}</h3>
                    <p className="mt-1 text-sm text-ink/60">
                      {m.word_count.toLocaleString()} words · {m.chapter_count} chapters · .{m.file_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-ink/50">
                      {statusLabels[m.status] || m.status}
                    </span>
                    <span className="text-ink/30">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
