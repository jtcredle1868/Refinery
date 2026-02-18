import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listManuscripts, getManuscriptAnalyses, runAnalysis } from '../../services/api';
import {
  FileText, ArrowUpDown, Filter, Play, Loader, AlertCircle, CheckCircle,
  ChevronDown, ArrowDownWideNarrow,
} from 'lucide-react';

const TIERS = [
  { label: 'Strong Consider', min: 80, max: 100 },
  { label: 'Consider', min: 60, max: 79 },
  { label: 'Maybe', min: 40, max: 59 },
  { label: 'Pass', min: 0, max: 39 },
];

function getTier(score) {
  if (score == null) return null;
  return TIERS.find((t) => score >= t.min && score <= t.max) || null;
}

function scoreBadgeClasses(score) {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-blue-100 text-blue-800';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function tierBadgeClasses(tierLabel) {
  switch (tierLabel) {
    case 'Strong Consider': return 'bg-green-100 text-green-800';
    case 'Consider': return 'bg-blue-100 text-blue-800';
    case 'Maybe': return 'bg-amber-100 text-amber-800';
    case 'Pass': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export default function TriageDashboardView() {
  const navigate = useNavigate();
  const [manuscripts, setManuscripts] = useState([]);
  const [analysesMap, setAnalysesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningId, setRunningId] = useState(null);
  const [filterTier, setFilterTier] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const loadData = async () => {
    try {
      const res = await listManuscripts();
      const msList = res.data.manuscripts || [];
      setManuscripts(msList);

      const analysesEntries = await Promise.all(
        msList.map(async (m) => {
          try {
            const aRes = await getManuscriptAnalyses(m.id);
            return [m.id, aRes.data];
          } catch {
            return [m.id, []];
          }
        })
      );
      setAnalysesMap(Object.fromEntries(analysesEntries));
    } catch (err) {
      setError('Failed to load manuscripts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAcquisitionScore = (manuscriptId) => {
    const analyses = analysesMap[manuscriptId] || [];
    const acq = analyses.find(
      (a) => a.analysis_type === 'acquisition_score' && a.status === 'completed'
    );
    if (!acq) return null;
    return acq.score_overall != null ? Math.round(acq.score_overall) : null;
  };

  const handleRunScore = async (e, manuscriptId) => {
    e.stopPropagation();
    setRunningId(manuscriptId);
    setError('');
    try {
      await runAnalysis(manuscriptId, 'acquisition_score');
      const aRes = await getManuscriptAnalyses(manuscriptId);
      setAnalysesMap((prev) => ({ ...prev, [manuscriptId]: aRes.data }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run acquisition score');
    } finally {
      setRunningId(null);
    }
  };

  const enrichedManuscripts = useMemo(() => {
    return manuscripts.map((m) => {
      const score = getAcquisitionScore(m.id);
      const tier = getTier(score);
      return { ...m, acquisitionScore: score, tier };
    });
  }, [manuscripts, analysesMap]);

  const tierCounts = useMemo(() => {
    const counts = { 'Strong Consider': 0, Consider: 0, Maybe: 0, Pass: 0 };
    enrichedManuscripts.forEach((m) => {
      if (m.tier) counts[m.tier.label] = (counts[m.tier.label] || 0) + 1;
    });
    return counts;
  }, [enrichedManuscripts]);

  const filteredAndSorted = useMemo(() => {
    let list = [...enrichedManuscripts];

    if (filterTier !== 'all') {
      list = list.filter((m) => m.tier && m.tier.label === filterTier);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.acquisitionScore ?? -1) - (a.acquisitionScore ?? -1);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'date':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [enrichedManuscripts, filterTier, sortBy]);

  const statusColors = {
    uploaded: 'bg-yellow-100 text-yellow-800',
    parsing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    analyzing: 'bg-purple-100 text-purple-800',
    analyzed: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-refinery-blue"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-refinery-navy">Acquisition Triage</h1>
        <p className="text-refinery-slate mt-1">Enterprise manuscript acquisition scoring and triage dashboard</p>
      </div>

      {/* Tier summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {TIERS.map((t) => (
          <div
            key={t.label}
            onClick={() => setFilterTier(filterTier === t.label ? 'all' : t.label)}
            className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${
              filterTier === t.label ? 'ring-2 ring-refinery-blue' : ''
            }`}
          >
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className="text-2xl font-bold text-refinery-navy mt-1">{tierCounts[t.label]}</p>
            <p className="text-xs text-slate-400 mt-1">Score {t.min}-{t.max}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Sort bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-refinery-blue"
          >
            <option value="all">All Tiers</option>
            <option value="Strong Consider">Strong Consider</option>
            <option value="Consider">Consider</option>
            <option value="Maybe">Maybe</option>
            <option value="Pass">Pass</option>
          </select>
        </div>

        <div className="relative">
          <button
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            className="flex items-center space-x-2 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
          >
            <ArrowDownWideNarrow className="h-4 w-4 text-slate-400" />
            <span>Sort: {sortBy === 'score' ? 'Score' : sortBy === 'title' ? 'Title' : 'Date'}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          {sortMenuOpen && (
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
              {[
                { value: 'score', label: 'Score (High-Low)' },
                { value: 'title', label: 'Title (A-Z)' },
                { value: 'date', label: 'Date (Newest)' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortMenuOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${
                    sortBy === opt.value ? 'text-refinery-blue font-medium' : 'text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manuscripts table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 bg-slate-50 border-b">
                <th className="px-6 py-3 font-medium">Title</th>
                <th className="px-6 py-3 font-medium">Word Count</th>
                <th className="px-6 py-3 font-medium">Acquisition Score</th>
                <th className="px-6 py-3 font-medium">Tier</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No manuscripts found for the selected filter.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/manuscript/${m.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-refinery-slate flex-shrink-0" />
                        <span className="font-medium text-refinery-navy">{m.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {(m.word_count || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {m.acquisitionScore != null ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${scoreBadgeClasses(m.acquisitionScore)}`}>
                          {m.acquisitionScore}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {m.tier ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tierBadgeClasses(m.tier.label)}`}>
                          {m.tier.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[m.status] || 'bg-slate-100 text-slate-600'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.acquisitionScore == null && (
                        <button
                          onClick={(e) => handleRunScore(e, m.id)}
                          disabled={runningId === m.id}
                          className="flex items-center space-x-1 bg-refinery-blue text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                          {runningId === m.id ? (
                            <>
                              <Loader className="h-3 w-3 animate-spin" />
                              <span>Scoring...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              <span>Run Acquisition Score</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
