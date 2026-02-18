import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';

const MODULE_COLORS = {
  intelligence_engine: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  prose_refinery: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  voice_isolation: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  pacing_architect: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  character_arc: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
};

const MODULE_LABELS = {
  intelligence_engine: 'Intelligence Engine',
  prose_refinery: 'Prose Refinery',
  voice_isolation: 'Voice Isolation',
  pacing_architect: 'Pacing Architect',
  character_arc: 'Character Arc',
};

const SEVERITY_STYLES = {
  high: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  low: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
};

const STATUS_OPTIONS = ['all', 'pending', 'accepted', 'rejected', 'deferred'];

const SEVERITY_OPTIONS = ['all', 'high', 'medium', 'low'];

const MODULE_OPTIONS = [
  'all',
  'intelligence_engine',
  'prose_refinery',
  'voice_isolation',
  'pacing_architect',
  'character_arc',
];

export default function RevisionCenterView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manuscript, setManuscript] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Item statuses tracked locally: { [index]: 'pending' | 'accepted' | 'rejected' | 'deferred' }
  const [itemStatuses, setItemStatuses] = useState({});

  // Sort
  const [sortField, setSortField] = useState('severity');
  const [sortDirection, setSortDirection] = useState('desc');

  // Expanded item for mobile / detail view
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, aRes] = await Promise.all([
        getManuscript(id),
        getManuscriptAnalyses(id),
      ]);
      setManuscript(mRes.data);

      const revisionAnalysis = aRes.data.find(
        (a) => a.analysis_type === 'revision_center' && a.status === 'completed'
      );

      if (revisionAnalysis) {
        const parsed = JSON.parse(revisionAnalysis.results_json);
        setResults(parsed);

        // Initialize all item statuses to pending
        const statuses = {};
        (parsed.items || []).forEach((_, idx) => {
          statuses[idx] = 'pending';
        });
        setItemStatuses(statuses);
      }
    } catch (err) {
      setError('Failed to load manuscript data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await runAnalysis(parseInt(id), 'revision_center');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate edit queue');
    } finally {
      setGenerating(false);
    }
  };

  const updateItemStatus = (idx, status) => {
    setItemStatuses((prev) => ({ ...prev, [idx]: status }));
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const severityRank = { high: 3, medium: 2, low: 1 };

  const getFilteredItems = () => {
    if (!results?.items) return [];

    let items = results.items.map((item, idx) => ({
      ...item,
      _idx: idx,
      _status: itemStatuses[idx] || 'pending',
    }));

    // Apply filters
    if (severityFilter !== 'all') {
      items = items.filter((item) => item.severity === severityFilter);
    }
    if (moduleFilter !== 'all') {
      items = items.filter((item) => item.module === moduleFilter);
    }
    if (statusFilter !== 'all') {
      items = items.filter((item) => item._status === statusFilter);
    }

    // Apply sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'severity') {
        cmp = (severityRank[a.severity] || 0) - (severityRank[b.severity] || 0);
      } else if (sortField === 'module') {
        cmp = (a.module || '').localeCompare(b.module || '');
      } else if (sortField === 'chapter') {
        cmp = (a.chapter || '').localeCompare(b.chapter || '', undefined, { numeric: true });
      } else if (sortField === 'type') {
        cmp = (a.finding_type || '').localeCompare(b.finding_type || '');
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return items;
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, accepted: 0, rejected: 0, deferred: 0 };
    Object.values(itemStatuses).forEach((s) => {
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-refinery-blue"></div>
      </div>
    );
  }

  // No manuscript
  if (!manuscript) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Manuscript not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-refinery-blue mt-2 inline-block hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const stats = results?.stats;
  const filteredItems = getFilteredItems();
  const statusCounts = getStatusCounts();

  return (
    <div>
      {/* Back navigation */}
      <button
        onClick={() => navigate(`/manuscript/${id}`)}
        className="flex items-center text-refinery-blue hover:underline mb-6 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </button>

      {/* Page header */}
      <div className="flex items-center space-x-3 mb-2">
        <Filter className="h-8 w-8 text-refinery-blue" />
        <h1 className="text-3xl font-display font-bold text-refinery-navy">
          Revision Command Center
        </h1>
      </div>
      <p className="text-refinery-slate mb-6">
        Aggregated edit queue for <span className="font-medium">{manuscript.title}</span>
      </p>

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* No results -- generate button */}
      {!results && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Filter className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-display font-semibold text-refinery-navy mb-2">
            No Edit Queue Generated
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Generate a consolidated edit queue by aggregating findings from all completed analysis
            modules. This gives you a single, prioritized list of every revision suggestion.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center space-x-2 bg-refinery-blue text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating Edit Queue...</span>
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                <span>Generate Edit Queue</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results present */}
      {results && (
        <>
          {/* Stats Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Total findings */}
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-refinery-navy">
                  {stats?.total || 0}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">
                  Total Findings
                </span>
              </div>

              {/* Severity breakdown */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>{stats?.high || 0} High</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>{stats?.medium || 0} Medium</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>{stats?.low || 0} Low</span>
                </span>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-10 bg-slate-200"></div>

              {/* Progress counters */}
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center space-x-1 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>{statusCounts.accepted} accepted</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>{statusCounts.rejected} rejected</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>{statusCounts.deferred} deferred</span>
                </span>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-10 bg-slate-200"></div>

              {/* By module pills */}
              {stats?.by_module && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wide mr-1">
                    By Module:
                  </span>
                  {Object.entries(stats.by_module).map(([mod, count]) => {
                    const colors = MODULE_COLORS[mod] || {
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                    };
                    return (
                      <span
                        key={mod}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {MODULE_LABELS[mod] || mod}: {count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Re-generate button */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center space-x-2 text-sm text-refinery-blue hover:text-blue-800 disabled:opacity-50 transition font-medium"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-refinery-blue"></div>
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Filter className="h-3.5 w-3.5" />
                    <span>Regenerate Edit Queue</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-wrap gap-6">
              {/* Severity filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Severity
                </label>
                <div className="flex flex-wrap gap-1">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSeverityFilter(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        severityFilter === opt
                          ? opt === 'high'
                            ? 'bg-red-600 text-white'
                            : opt === 'medium'
                            ? 'bg-amber-500 text-white'
                            : opt === 'low'
                            ? 'bg-green-600 text-white'
                            : 'bg-refinery-navy text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Module
                </label>
                <div className="flex flex-wrap gap-1">
                  {MODULE_OPTIONS.map((opt) => {
                    const colors = MODULE_COLORS[opt];
                    const isActive = moduleFilter === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setModuleFilter(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? colors
                              ? `${colors.bg} ${colors.text} ring-1 ${colors.border}`
                              : 'bg-refinery-navy text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt === 'all' ? 'All' : MODULE_LABELS[opt] || opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStatusFilter(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        statusFilter === opt
                          ? opt === 'accepted'
                            ? 'bg-green-600 text-white'
                            : opt === 'rejected'
                            ? 'bg-red-600 text-white'
                            : opt === 'deferred'
                            ? 'bg-slate-600 text-white'
                            : 'bg-refinery-navy text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active filter summary */}
            {(severityFilter !== 'all' || moduleFilter !== 'all' || statusFilter !== 'all') && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Showing {filteredItems.length} of {results.items?.length || 0} findings
                </span>
                <button
                  onClick={() => {
                    setSeverityFilter('all');
                    setModuleFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-refinery-blue hover:underline font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Edit Queue Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Table header */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wide">
              <div
                className="col-span-1 flex items-center cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort('severity')}
              >
                Severity
                {sortField === 'severity' &&
                  (sortDirection === 'desc' ? (
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronUp className="h-3 w-3 ml-0.5" />
                  ))}
              </div>
              <div
                className="col-span-2 flex items-center cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort('module')}
              >
                Module
                {sortField === 'module' &&
                  (sortDirection === 'desc' ? (
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronUp className="h-3 w-3 ml-0.5" />
                  ))}
              </div>
              <div
                className="col-span-1 flex items-center cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort('type')}
              >
                Type
                {sortField === 'type' &&
                  (sortDirection === 'desc' ? (
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronUp className="h-3 w-3 ml-0.5" />
                  ))}
              </div>
              <div
                className="col-span-1 flex items-center cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort('chapter')}
              >
                Location
                {sortField === 'chapter' &&
                  (sortDirection === 'desc' ? (
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronUp className="h-3 w-3 ml-0.5" />
                  ))}
              </div>
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Items */}
            {filteredItems.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <AlertTriangle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No findings match the current filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const sevStyle = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.low;
                  const modColors = MODULE_COLORS[item.module] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                  };
                  const isExpanded = expandedItem === item._idx;
                  const currentStatus = item._status;

                  return (
                    <div
                      key={item._idx}
                      className={`px-6 py-4 transition hover:bg-slate-50 ${
                        currentStatus === 'accepted'
                          ? 'bg-green-50/40'
                          : currentStatus === 'rejected'
                          ? 'bg-red-50/30 opacity-60'
                          : currentStatus === 'deferred'
                          ? 'bg-slate-50/50'
                          : ''
                      }`}
                    >
                      {/* Desktop row */}
                      <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-start">
                        {/* Severity */}
                        <div className="col-span-1">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sevStyle.bg} ${sevStyle.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`}></span>
                            <span>{item.severity}</span>
                          </span>
                        </div>

                        {/* Module */}
                        <div className="col-span-2">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${modColors.bg} ${modColors.text}`}
                          >
                            {MODULE_LABELS[item.module] || item.module}
                          </span>
                        </div>

                        {/* Finding type */}
                        <div className="col-span-1">
                          <span className="text-xs text-slate-600 font-medium">
                            {item.finding_type || '--'}
                          </span>
                        </div>

                        {/* Chapter location */}
                        <div className="col-span-1">
                          <span className="text-xs text-slate-500 font-mono">
                            {item.chapter || '--'}
                          </span>
                        </div>

                        {/* Description + suggestion */}
                        <div className="col-span-4">
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {item.description}
                          </p>
                          {item.suggestion && (
                            <div className="mt-2 pl-3 border-l-2 border-refinery-blue/30">
                              <p className="text-xs text-slate-500 font-medium mb-0.5">
                                Suggestion
                              </p>
                              <p className="text-sm text-slate-600 italic">
                                {item.suggestion}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              currentStatus === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : currentStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : currentStatus === 'deferred'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end space-x-1">
                          <button
                            onClick={() => updateItemStatus(item._idx, 'accepted')}
                            title="Accept"
                            className={`p-1.5 rounded-lg transition ${
                              currentStatus === 'accepted'
                                ? 'bg-green-200 text-green-800'
                                : 'hover:bg-green-100 text-slate-400 hover:text-green-700'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateItemStatus(item._idx, 'rejected')}
                            title="Reject"
                            className={`p-1.5 rounded-lg transition ${
                              currentStatus === 'rejected'
                                ? 'bg-red-200 text-red-800'
                                : 'hover:bg-red-100 text-slate-400 hover:text-red-700'
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateItemStatus(item._idx, 'deferred')}
                            title="Defer"
                            className={`p-1.5 rounded-lg transition ${
                              currentStatus === 'deferred'
                                ? 'bg-slate-300 text-slate-800'
                                : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile card layout */}
                      <div className="lg:hidden">
                        <div
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() =>
                            setExpandedItem(isExpanded ? null : item._idx)
                          }
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sevStyle.bg} ${sevStyle.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`}></span>
                              <span>{item.severity}</span>
                            </span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${modColors.bg} ${modColors.text}`}
                            >
                              {MODULE_LABELS[item.module] || item.module}
                            </span>
                            {item.chapter && (
                              <span className="text-xs text-slate-400 font-mono">
                                {item.chapter}
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {item.description}
                        </p>

                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            {item.finding_type && (
                              <p className="text-xs text-slate-500">
                                <span className="font-medium">Type:</span> {item.finding_type}
                              </p>
                            )}
                            {item.suggestion && (
                              <div className="pl-3 border-l-2 border-refinery-blue/30">
                                <p className="text-xs text-slate-500 font-medium mb-0.5">
                                  Suggestion
                                </p>
                                <p className="text-sm text-slate-600 italic">
                                  {item.suggestion}
                                </p>
                              </div>
                            )}

                            {/* Mobile actions */}
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItemStatus(item._idx, 'accepted');
                                }}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  currentStatus === 'accepted'
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItemStatus(item._idx, 'rejected');
                                }}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  currentStatus === 'rejected'
                                    ? 'bg-red-200 text-red-800'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItemStatus(item._idx, 'deferred');
                                }}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  currentStatus === 'deferred'
                                    ? 'bg-slate-300 text-slate-800'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>Defer</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer summary */}
            {filteredItems.length > 0 && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {filteredItems.length} finding{filteredItems.length !== 1 ? 's' : ''} shown
                </span>
                <span>
                  {statusCounts.accepted} accepted / {statusCounts.rejected} rejected /{' '}
                  {statusCounts.deferred} deferred / {statusCounts.pending} pending
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
