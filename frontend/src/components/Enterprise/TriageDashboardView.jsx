import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listManuscripts, getManuscriptAnalyses, runAnalysis,
  batchAssign, batchPass, batchExportCsv,
} from '../../services/api';
import {
  FileText, Filter, Play, Loader, AlertCircle, CheckCircle,
  ChevronDown, ArrowDownWideNarrow, CheckSquare, Square, UserPlus,
  XCircle, Download, Users,
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
    default: return 'bg-ink/10 text-ink/70';
  }
}

export default function TriageDashboardView() {
  const navigate = useNavigate();
  const [manuscripts, setManuscripts] = useState([]);
  const [analysesMap, setAnalysesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [runningId, setRunningId] = useState(null);
  const [filterTier, setFilterTier] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Batch action state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

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
    } catch (_err) {
      setError('Failed to load manuscripts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
        case 'score': return (b.acquisitionScore ?? -1) - (a.acquisitionScore ?? -1);
        case 'title': return (a.title || '').localeCompare(b.title || '');
        case 'date': return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default: return 0;
      }
    });
    return list;
  }, [enrichedManuscripts, filterTier, sortBy]);

  // Analytics strip
  const analytics = useMemo(() => {
    const total = manuscripts.length;
    const scored = enrichedManuscripts.filter((m) => m.acquisitionScore != null).length;
    const avgScore = scored > 0
      ? Math.round(enrichedManuscripts.filter((m) => m.acquisitionScore != null).reduce((s, m) => s + m.acquisitionScore, 0) / scored)
      : 0;
    return { total, scored, pctAnalyzed: total ? Math.round((scored / total) * 100) : 0, avgScore };
  }, [manuscripts, enrichedManuscripts]);

  // Selection helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredAndSorted.map((m) => m.id)));
  };

  // Batch handlers
  const handleBatchAssign = async () => {
    if (!assignEmail.trim()) return;
    setBatchLoading(true); setError('');
    try {
      const res = await batchAssign([...selectedIds], assignEmail.trim());
      setSuccess(res.data.message);
      setShowAssignModal(false); setAssignEmail(''); setSelectedIds(new Set());
    } catch (err) { setError(err.response?.data?.detail || 'Batch assign failed'); }
    finally { setBatchLoading(false); }
  };

  const handleBatchPass = async () => {
    setBatchLoading(true); setError('');
    try {
      const res = await batchPass([...selectedIds]);
      setSuccess(res.data.message); setSelectedIds(new Set());
    } catch (err) { setError(err.response?.data?.detail || 'Batch pass failed'); }
    finally { setBatchLoading(false); }
  };

  const handleExportCsv = async () => {
    setBatchLoading(true); setError('');
    try {
      const ids = selectedIds.size > 0 ? [...selectedIds] : manuscripts.map((m) => m.id);
      const res = await batchExportCsv(ids);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'manuscripts_export.csv'; a.click();
      URL.revokeObjectURL(url);
      setSuccess('CSV exported successfully');
    } catch (err) { setError(err.response?.data?.detail || 'CSV export failed'); }
    finally { setBatchLoading(false); }
  };

  const statusColors = {
    uploaded: 'bg-yellow-100 text-yellow-800', parsing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800', analyzing: 'bg-purple-100 text-purple-800',
    analyzed: 'bg-emerald-100 text-emerald-800', error: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-plum"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">Acquisition Triage</h1>
        <p className="text-ink/60 mt-1">Enterprise manuscript acquisition scoring and triage dashboard</p>
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Total Submissions</p>
          <p className="text-2xl font-bold text-ink mt-1">{analytics.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Analyzed</p>
          <p className="text-2xl font-bold text-ink mt-1">{analytics.pctAnalyzed}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Avg Score</p>
          <p className="text-2xl font-bold text-ink mt-1">{analytics.avgScore || '--'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Top Tier</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{tierCounts['Strong Consider']}</p>
        </div>
      </div>

      {/* Tier filter cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {TIERS.map((t) => (
          <div key={t.label}
            onClick={() => setFilterTier(filterTier === t.label ? 'all' : t.label)}
            className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${filterTier === t.label ? 'ring-2 ring-refinery-blue' : ''}`}
          >
            <p className="text-sm text-ink/60">{t.label}</p>
            <p className="text-2xl font-bold text-ink mt-1">{tierCounts[t.label]}</p>
            <p className="text-xs text-ink/40 mt-1">Score {t.min}-{t.max}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><XCircle className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" /><span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto"><XCircle className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter & Sort bar + Batch actions */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-ink/40" />
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-refinery-blue">
            <option value="all">All Tiers</option>
            <option value="Strong Consider">Strong Consider</option>
            <option value="Consider">Consider</option>
            <option value="Maybe">Maybe</option>
            <option value="Pass">Pass</option>
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-ink/70 mr-2">{selectedIds.size} selected</span>
            <button onClick={() => setShowAssignModal(true)} disabled={batchLoading}
              className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition">
              <UserPlus className="h-3 w-3" /><span>Assign</span>
            </button>
            <button onClick={handleBatchPass} disabled={batchLoading}
              className="flex items-center space-x-1 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition">
              <XCircle className="h-3 w-3" /><span>Pass</span>
            </button>
            <button onClick={handleExportCsv} disabled={batchLoading}
              className="flex items-center space-x-1 bg-slate-600 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-slate-700 disabled:opacity-50 transition">
              <Download className="h-3 w-3" /><span>CSV</span>
            </button>
          </div>
        )}

        {selectedIds.size === 0 && (
          <button onClick={handleExportCsv}
            className="flex items-center space-x-1 text-sm text-ink/70 hover:text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5 transition">
            <Download className="h-4 w-4" /><span>Export All CSV</span>
          </button>
        )}

        <div className="relative">
          <button onClick={() => setSortMenuOpen(!sortMenuOpen)}
            className="flex items-center space-x-2 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-ink/5 transition">
            <ArrowDownWideNarrow className="h-4 w-4 text-ink/40" />
            <span>Sort: {sortBy === 'score' ? 'Score' : sortBy === 'title' ? 'Title' : 'Date'}</span>
            <ChevronDown className="h-3 w-3 text-ink/40" />
          </button>
          {sortMenuOpen && (
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
              {[{ value: 'score', label: 'Score (High-Low)' }, { value: 'title', label: 'Title (A-Z)' }, { value: 'date', label: 'Date (Newest)' }].map((opt) => (
                <button key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortMenuOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-ink/5 ${sortBy === opt.value ? 'text-plum font-medium' : 'text-ink/80'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink/60 bg-ink/5 border-b">
                <th className="px-4 py-3 font-medium w-10">
                  <button onClick={toggleSelectAll} className="text-ink/40 hover:text-ink/70">
                    {selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0
                      ? <CheckSquare className="h-4 w-4 text-plum" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Word Count</th>
                <th className="px-4 py-3 font-medium">Acquisition Score</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filteredAndSorted.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-ink/40">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-ink/40" /><p>No manuscripts found.</p>
                </td></tr>
              ) : (
                filteredAndSorted.map((m) => (
                  <tr key={m.id} className={`hover:bg-ink/5 cursor-pointer transition ${selectedIds.has(m.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4" onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}>
                      {selectedIds.has(m.id) ? <CheckSquare className="h-4 w-4 text-plum" /> : <Square className="h-4 w-4 text-ink/40" />}
                    </td>
                    <td className="px-4 py-4" onClick={() => navigate(`/manuscript/${m.id}`)}>
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-ink/60 flex-shrink-0" />
                        <span className="font-medium text-ink">{m.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-ink/70" onClick={() => navigate(`/manuscript/${m.id}`)}>{(m.word_count || 0).toLocaleString()}</td>
                    <td className="px-4 py-4" onClick={() => navigate(`/manuscript/${m.id}`)}>
                      {m.acquisitionScore != null
                        ? <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${scoreBadgeClasses(m.acquisitionScore)}`}>{m.acquisitionScore}</span>
                        : <span className="text-xs text-ink/40">--</span>}
                    </td>
                    <td className="px-4 py-4" onClick={() => navigate(`/manuscript/${m.id}`)}>
                      {m.tier
                        ? <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tierBadgeClasses(m.tier.label)}`}>{m.tier.label}</span>
                        : <span className="text-xs text-ink/40">--</span>}
                    </td>
                    <td className="px-4 py-4" onClick={() => navigate(`/manuscript/${m.id}`)}>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[m.status] || 'bg-ink/10 text-ink/70'}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-4">
                      {m.acquisitionScore == null && (
                        <button onClick={(e) => handleRunScore(e, m.id)} disabled={runningId === m.id}
                          className="flex items-center space-x-1 bg-ink text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-ink/80 disabled:opacity-50 transition">
                          {runningId === m.id ? <><Loader className="h-3 w-3 animate-spin" /><span>Scoring...</span></> : <><Play className="h-3 w-3" /><span>Score</span></>}
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

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display text-ink mb-4">
              <Users className="h-5 w-5 inline mr-2" />Assign {selectedIds.size} Manuscript{selectedIds.size > 1 ? 's' : ''} to Editor
            </h3>
            <input type="email" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="Editor's email address"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-refinery-blue mb-4" />
            <div className="flex space-x-3">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 border border-slate-300 text-ink/80 px-4 py-2 rounded-lg text-sm font-medium hover:bg-ink/5 transition">Cancel</button>
              <button onClick={handleBatchAssign} disabled={!assignEmail.trim() || batchLoading}
                className="flex-1 bg-ink text-parchment px-4 py-2 rounded-full uppercase tracking-wider text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition">
                {batchLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
