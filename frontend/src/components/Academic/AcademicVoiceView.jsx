import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';
import { ArrowLeft, GraduationCap, Play, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function AcademicVoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manuscript, setManuscript] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [discipline, setDiscipline] = useState('general');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [mRes, aRes] = await Promise.all([getManuscript(id), getManuscriptAnalyses(id)]);
        setManuscript(mRes.data);
        const analysis = aRes.data.find(a => a.analysis_type === 'academic_voice' && a.status === 'completed');
        if (analysis?.results_json) setResults(JSON.parse(analysis.results_json));
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleRun = async () => {
    setRunning(true); setError('');
    try {
      const res = await runAnalysis(parseInt(id), 'academic_voice', { discipline });
      if (res.data.results_json) setResults(JSON.parse(res.data.results_json));
    } catch (err) { setError(err.response?.data?.detail || 'Analysis failed'); }
    finally { setRunning(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div></div>;

  return (
    <div>
      <button onClick={() => navigate(`/manuscript/${id}`)} className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Manuscript
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-10 w-10 text-violet-500" />
          <div>
            <h1 className="text-2xl font-display font-bold text-refinery-navy">Academic Voice Calibration</h1>
            <p className="text-sm text-slate-500">{manuscript?.title}</p>
          </div>
        </div>
        {!results && (
          <div className="flex items-center space-x-3">
            <select value={discipline} onChange={e => setDiscipline(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="general">General</option><option value="humanities">Humanities</option>
              <option value="social_sciences">Social Sciences</option><option value="stem">STEM</option>
              <option value="law">Law</option>
            </select>
            <button onClick={handleRun} disabled={running} className="flex items-center space-x-2 bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
              {running ? <><Loader className="h-4 w-4 animate-spin" /><span>Analyzing...</span></> : <><Play className="h-4 w-4" /><span>Run Voice Analysis</span></>}
            </button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

      {results && (
        <div className="space-y-8">
          {/* Score Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <p className="text-4xl font-bold text-violet-600">{results.voice_score || 0}</p>
              <p className="text-sm text-slate-500 mt-1">Overall Voice Score</p>
            </div>
            {results.sub_scores && Object.entries(results.sub_scores).map(([key, val]) => (
              <div key={key} className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <p className="text-3xl font-bold text-refinery-navy">{val || 0}</p>
                <p className="text-sm text-slate-500 mt-1 capitalize">{key.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>

          {/* Register Consistency */}
          {results.register_consistency?.chapters && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-refinery-navy mb-4">Register Consistency</h2>
              <p className="text-sm text-slate-500 mb-4">Overall Formality: {results.register_consistency.overall_formality}/10</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2">Chapter</th>
                      <th className="text-left px-3 py-2">Formality</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.register_consistency.chapters.map((ch, i) => (
                      <tr key={i} className={`border-t ${ch.flagged ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2">{ch.chapter}. {ch.title}</td>
                        <td className="px-3 py-2">
                          <span className={`font-medium ${ch.formality_score < 6 ? 'text-red-600' : ch.formality_score < 8 ? 'text-amber-600' : 'text-green-600'}`}>
                            {ch.formality_score}/10
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {ch.flagged ? (
                            <span className="flex items-center text-red-600"><AlertTriangle className="h-3 w-3 mr-1" />Flagged</span>
                          ) : (
                            <span className="flex items-center text-green-600"><CheckCircle className="h-3 w-3 mr-1" />OK</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{ch.informal_passages?.length || 0} issues</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Informal passages detail */}
              {results.register_consistency.chapters.filter(ch => ch.informal_passages?.length).map(ch => (
                <div key={ch.chapter} className="mt-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Chapter {ch.chapter} — Informal Passages</h3>
                  {ch.informal_passages.map((p, i) => (
                    <div key={i} className="ml-4 mb-3 border-l-2 border-amber-300 pl-3">
                      <p className="text-sm text-red-600">"{p.text}"</p>
                      <p className="text-xs text-slate-500">{p.issue}</p>
                      <p className="text-xs text-green-600 mt-1">Suggestion: {p.suggestion}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Hedge Analysis */}
          {results.hedge_analysis && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-refinery-navy mb-4">Hedge Analysis</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-amber-600 mb-3">Over-Hedged ({results.hedge_analysis.over_hedged?.length || 0})</h3>
                  {results.hedge_analysis.over_hedged?.map((h, i) => (
                    <div key={i} className="mb-3 border rounded-lg p-3">
                      <p className="text-xs text-slate-400">Chapter {h.chapter}</p>
                      <p className="text-sm text-slate-700">"{h.passage}"</p>
                      <p className="text-xs text-amber-600 mt-1">Hedge words: {h.hedge_words?.join(', ')}</p>
                      <p className="text-xs text-green-600 mt-1">{h.suggestion}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-3">Under-Hedged ({results.hedge_analysis.under_hedged?.length || 0})</h3>
                  {results.hedge_analysis.under_hedged?.map((h, i) => (
                    <div key={i} className="mb-3 border rounded-lg p-3">
                      <p className="text-xs text-slate-400">Chapter {h.chapter}</p>
                      <p className="text-sm text-slate-700">"{h.passage}"</p>
                      <p className="text-xs text-red-600 mt-1">{h.issue}</p>
                      <p className="text-xs text-green-600 mt-1">{h.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Passive Voice Chart */}
          {results.passive_voice?.chapters && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-refinery-navy mb-4">
                Passive Voice Density — Overall: {results.passive_voice.overall_percentage?.toFixed(1)}%
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.passive_voice.chapters}>
                  <XAxis dataKey="chapter" label={{ value: 'Chapter', position: 'bottom' }} />
                  <YAxis label={{ value: 'Passive %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" label="Threshold (40%)" />
                  <Bar dataKey="passive_pct" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {results.passive_voice.chapters.map((ch, i) => (
                      <Cell key={i} fill={ch.flagged ? '#ef4444' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Worst examples */}
              {results.passive_voice.chapters.filter(ch => ch.worst_examples?.length).slice(0, 3).map(ch => (
                <div key={ch.chapter} className="mt-3 border-t pt-3">
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Chapter {ch.chapter} examples</h3>
                  {ch.worst_examples.slice(0, 2).map((ex, i) => (
                    <div key={i} className="ml-4 text-xs mb-1">
                      <span className="text-red-500 line-through">{ex.passive}</span> → <span className="text-green-600">{ex.active}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {results.summary && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-refinery-navy mb-3">Summary</h2>
              <p className="text-sm text-slate-700 whitespace-pre-line">{results.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
