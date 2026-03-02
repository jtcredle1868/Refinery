import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';
import { ArrowLeft, Quote, AlertTriangle, CheckCircle, Play, Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function CitationArchitectureView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manuscript, setManuscript] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [citationFormat, setCitationFormat] = useState('APA');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [mRes, aRes] = await Promise.all([getManuscript(id), getManuscriptAnalyses(id)]);
        setManuscript(mRes.data);
        const analysis = aRes.data.find(a => a.analysis_type === 'citation_architecture' && a.status === 'completed');
        if (analysis?.results_json) setResults(JSON.parse(analysis.results_json));
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleRun = async () => {
    setRunning(true); setError('');
    try {
      const res = await runAnalysis(parseInt(id), 'citation_architecture', { citation_format: citationFormat });
      if (res.data.results_json) setResults(JSON.parse(res.data.results_json));
    } catch (err) { setError(err.response?.data?.detail || 'Analysis failed'); }
    finally { setRunning(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div></div>;

  return (
    <div>
      <button onClick={() => navigate(`/manuscript/${id}`)} className="flex items-center text-sm text-ink/60 hover:text-ink/80 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Manuscript
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Quote className="h-10 w-10 text-cyan-500" />
          <div>
            <h1 className="text-2xl font-display text-ink">Citation & Source Architecture</h1>
            <p className="text-sm text-ink/60">{manuscript?.title}</p>
          </div>
        </div>
        {!results && (
          <div className="flex items-center space-x-3">
            <select value={citationFormat} onChange={e => setCitationFormat(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="APA">APA</option><option value="MLA">MLA</option>
              <option value="Chicago">Chicago</option><option value="AMA">AMA</option>
            </select>
            <button onClick={handleRun} disabled={running} className="flex items-center space-x-2 bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
              {running ? <><Loader className="h-4 w-4 animate-spin" /><span>Analyzing...</span></> : <><Play className="h-4 w-4" /><span>Run Citation Analysis</span></>}
            </button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">{error}</div>}

      {results && (
        <div className="space-y-8">
          {/* Score Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-4xl font-bold text-cyan-600">{results.citation_score || 0}</p>
                <p className="text-sm text-ink/60 mt-1">Citation Score</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-ink">{results.citation_frequency_heatmap?.total_citations || 0}</p>
                <p className="text-sm text-ink/60 mt-1">Total Citations</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-ink">{results.citation_frequency_heatmap?.unique_sources || 0}</p>
                <p className="text-sm text-ink/60 mt-1">Unique Sources</p>
              </div>
            </div>
          </div>

          {/* Citation Frequency by Chapter */}
          {results.citation_frequency_heatmap?.chapters && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-display text-ink mb-4">Citation Frequency by Chapter</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.citation_frequency_heatmap.chapters}>
                  <XAxis dataKey="chapter" label={{ value: 'Chapter', position: 'bottom' }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="citation_count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Over-reliant sources */}
              {results.citation_frequency_heatmap.chapters.some(ch => ch.top_cited_sources?.some(s => s.over_reliant)) && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-amber-600 mb-2">Over-reliant Sources</h3>
                  {results.citation_frequency_heatmap.chapters.map(ch =>
                    ch.top_cited_sources?.filter(s => s.over_reliant).map((s, i) => (
                      <div key={`${ch.chapter}-${i}`} className="flex items-center space-x-2 text-sm text-ink/70 py-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>Ch. {ch.chapter}: "{s.source}" — {s.percentage_of_chapter?.toFixed(0)}% of citations</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Citation Gaps */}
          {results.citation_gaps?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-display text-ink mb-4">Citation Gaps ({results.citation_gaps.length})</h2>
              <div className="space-y-3">
                {results.citation_gaps.map((gap, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Chapter {gap.chapter}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${gap.confidence > 80 ? 'bg-red-100 text-red-700' : gap.confidence > 50 ? 'bg-amber-100 text-amber-700' : 'bg-ink/10 text-ink/70'}`}>
                        {gap.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-ink/80 mb-1">"{gap.claim}"</p>
                    <p className="text-xs text-ink/60">Needs: {gap.suggested_type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Recency */}
          {results.source_recency && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-display text-ink mb-4">Source Recency</h2>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={300} height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Recent (0-5yr)', value: results.source_recency.recent_5_years_pct || 0 },
                        { name: 'Mid (5-10yr)', value: results.source_recency.mid_5_10_years_pct || 0 },
                        { name: 'Old (10+yr)', value: results.source_recency.old_10_plus_years_pct || 0 },
                      ]}
                      cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value?.toFixed(0)}%`}
                    >
                      {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Primary/Secondary Balance */}
          {results.primary_secondary_balance && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-display text-ink mb-4">Primary vs Secondary Sources</h2>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 bg-ink/10 rounded-full h-6 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${results.primary_secondary_balance.primary_source_pct || 50}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Primary: {results.primary_secondary_balance.primary_source_pct?.toFixed(0)}%</span>
                <span className="text-ink/70">Secondary: {results.primary_secondary_balance.secondary_source_pct?.toFixed(0)}%</span>
              </div>
              <p className="text-sm text-ink/60 mt-2">{results.primary_secondary_balance.recommendation}</p>
            </div>
          )}

          {/* Format Validation */}
          {results.format_validation && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-display text-ink mb-4">
                Format Validation ({results.format_validation.format}) — {results.format_validation.errors_found || 0} errors
              </h2>
              {results.format_validation.errors?.length > 0 ? (
                <div className="space-y-3">
                  {results.format_validation.errors.map((err, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <p className="text-sm text-ink/60">Chapter {err.chapter}</p>
                      <p className="text-sm text-red-600 line-through">{err.citation_text}</p>
                      <p className="text-sm text-green-600">{err.correction}</p>
                      <p className="text-xs text-ink/40 mt-1">{err.issue}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-green-600"><CheckCircle className="h-5 w-5" /><span>No formatting errors found</span></div>
              )}
            </div>
          )}

          {/* Summary */}
          {results.summary && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-display text-ink mb-3">Summary</h2>
              <p className="text-sm text-ink/80 whitespace-pre-line">{results.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
