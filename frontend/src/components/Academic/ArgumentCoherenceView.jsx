import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';
import {
  ArrowLeft, Play, Loader, AlertCircle, CheckCircle, Target, GitBranch,
  Shield, BarChart3, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function ScoreRing({ score, label, size = 80 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        />
      </svg>
      <span className="text-xl font-bold -mt-12 mb-6" style={{ color }}>{score}</span>
      <span className="text-xs text-slate-500 mt-1">{label}</span>
    </div>
  );
}

const strengthColor = (strength) => {
  switch (strength) {
    case 'strong': return 'bg-green-100 text-green-700 border-green-300';
    case 'adequate': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'weak': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'missing': return 'bg-red-100 text-red-700 border-red-300';
    default: return 'bg-slate-100 text-slate-600 border-slate-300';
  }
};

const strengthDot = (strength) => {
  switch (strength) {
    case 'strong': return 'bg-green-500';
    case 'adequate': return 'bg-blue-500';
    case 'weak': return 'bg-amber-500';
    case 'missing': return 'bg-red-500';
    default: return 'bg-slate-400';
  }
};

const adequacyBadge = (adequacy) => {
  switch (adequacy) {
    case 'strong':
    case 'adequate': return 'bg-green-100 text-green-700';
    case 'partial': return 'bg-amber-100 text-amber-700';
    case 'weak':
    case 'insufficient': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export default function ArgumentCoherenceView() {
  const { id } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [discipline, setDiscipline] = useState('general');
  const [documentType, setDocumentType] = useState('thesis');
  const [expandedClaims, setExpandedClaims] = useState({});

  const load = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        getManuscript(id),
        getManuscriptAnalyses(id),
      ]);
      setManuscript(mRes.data);
      const analysis = aRes.data.find(
        (a) => a.analysis_type === 'argument_coherence' && a.status === 'completed'
      );
      if (analysis) {
        setResults(JSON.parse(analysis.results_json));
      }
    } catch (err) {
      setError('Failed to load manuscript');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRunAnalysis = async () => {
    setRunning(true);
    setError('');
    try {
      await runAnalysis(parseInt(id), 'argument_coherence', {
        discipline,
        document_type: documentType,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Argument coherence analysis failed');
    } finally {
      setRunning(false);
    }
  };

  const toggleClaims = (chapterIdx) => {
    setExpandedClaims((prev) => ({ ...prev, [chapterIdx]: !prev[chapterIdx] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-refinery-blue"></div>
      </div>
    );
  }

  if (!manuscript) {
    return <div className="text-center py-20 text-slate-500">Manuscript not found</div>;
  }

  const thesis = results?.thesis_statement;
  const evidenceRatio = results?.evidence_to_claim_ratio;
  const progression = results?.logical_progression;
  const counterarguments = results?.counterargument_coverage;
  const chapterScores = results?.chapter_coherence_scores;

  const chapterBarData = (chapterScores || []).map((ch) => ({
    chapter: ch.chapter_title || `Ch ${ch.chapter_number}`,
    score: ch.coherence_score,
  }));

  return (
    <div>
      <Link to={`/manuscript/${id}`} className="flex items-center text-refinery-blue hover:underline mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </Link>

      <div className="flex items-center space-x-3 mb-2">
        <Target className="h-8 w-8 text-refinery-blue" />
        <h1 className="text-3xl font-display font-bold text-refinery-navy">Argument Coherence Engine</h1>
      </div>
      <p className="text-refinery-slate mb-6">Module 7 -- Argument structure and logical coherence analysis</p>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Run Analysis Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="font-display font-semibold text-refinery-navy mb-4">Run Argument Analysis</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Discipline</label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-refinery-blue focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="humanities">Humanities</option>
              <option value="social_sciences">Social Sciences</option>
              <option value="stem">STEM</option>
              <option value="law">Law</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-refinery-blue focus:border-transparent"
            >
              <option value="thesis">Thesis</option>
              <option value="dissertation">Dissertation</option>
              <option value="journal_article">Journal Article</option>
              <option value="conference_paper">Conference Paper</option>
              <option value="book_chapter">Book Chapter</option>
            </select>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={running}
            className="flex items-center space-x-2 bg-refinery-blue text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {running ? (
              <><Loader className="h-4 w-4 animate-spin" /><span>Analyzing...</span></>
            ) : (
              <><Play className="h-4 w-4" /><span>Run Argument Analysis</span></>
            )}
          </button>
        </div>
      </div>

      {!results && (
        <div className="text-center py-16">
          <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No argument analysis results. Run the analysis above to begin.</p>
        </div>
      )}

      {results && (
        <>
          {/* Header Scores */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex flex-wrap items-center justify-around gap-6">
              <ScoreRing score={Math.round(results.coherence_score || 0)} label="Coherence Score" size={100} />
              {thesis && (
                <ScoreRing score={Math.round(thesis.clarity_score || 0)} label="Thesis Clarity" size={100} />
              )}
            </div>
          </div>

          {/* Thesis Statement Card */}
          {thesis && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-refinery-blue" />
                <h2 className="font-display font-semibold text-refinery-navy">Thesis Statement</h2>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-800 italic">"{thesis.extracted_thesis}"</p>
                {thesis.location && (
                  <p className="text-xs text-slate-500 mt-2">Location: {thesis.location}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-refinery-navy">{Math.round(thesis.clarity_score || 0)}</p>
                  <p className="text-xs text-slate-500">Clarity Score</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-600 mb-1">Restated in Chapters</p>
                  <div className="flex flex-wrap gap-1">
                    {(thesis.restated_chapters || []).map((ch, i) => (
                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{ch}</span>
                    ))}
                    {(thesis.restated_chapters || []).length === 0 && (
                      <span className="text-xs text-slate-400">None detected</span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-600 mb-1">Contested in Chapters</p>
                  <div className="flex flex-wrap gap-1">
                    {(thesis.contested_chapters || []).map((ch, i) => (
                      <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{ch}</span>
                    ))}
                    {(thesis.contested_chapters || []).length === 0 && (
                      <span className="text-xs text-slate-400">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence-to-Claim Ratio */}
          {evidenceRatio && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="h-5 w-5 text-refinery-blue" />
                <h2 className="font-display font-semibold text-refinery-navy">Evidence-to-Claim Ratio</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="pb-2 pr-4">Chapter</th>
                      <th className="pb-2 pr-4">Claims Made</th>
                      <th className="pb-2 pr-4">Evidence Provided</th>
                      <th className="pb-2 pr-4">Ratio</th>
                      <th className="pb-2">Under-supported Claims</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(evidenceRatio.chapters || []).map((ch, i) => {
                      const ratio = ch.ratio || 0;
                      const ratioColor = ratio > 1.0 ? 'text-green-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-red-600';
                      const ratioBg = ratio > 1.0 ? 'bg-green-50' : ratio >= 0.5 ? 'bg-amber-50' : 'bg-red-50';
                      return (
                        <React.Fragment key={i}>
                          <tr className="hover:bg-slate-50">
                            <td className="py-3 pr-4 font-medium text-slate-700">
                              {ch.chapter_title || `Chapter ${ch.chapter_number}`}
                            </td>
                            <td className="py-3 pr-4 text-slate-600">{ch.claims_made}</td>
                            <td className="py-3 pr-4 text-slate-600">{ch.evidence_provided}</td>
                            <td className="py-3 pr-4">
                              <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${ratioBg} ${ratioColor}`}>
                                {ratio.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3">
                              {(ch.under_supported_claims || []).length > 0 ? (
                                <button
                                  onClick={() => toggleClaims(i)}
                                  className="flex items-center space-x-1 text-xs text-refinery-blue hover:underline"
                                >
                                  <span>{ch.under_supported_claims.length} claim(s)</span>
                                  {expandedClaims[i] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              ) : (
                                <span className="text-xs text-green-600 flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>All supported</span>
                                </span>
                              )}
                            </td>
                          </tr>
                          {expandedClaims[i] && (ch.under_supported_claims || []).length > 0 && (
                            <tr>
                              <td colSpan={5} className="pb-3 pt-0">
                                <div className="ml-4 space-y-2">
                                  {ch.under_supported_claims.map((claim, j) => (
                                    <div key={j} className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
                                      <p className="text-slate-700">{claim}</p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Logical Progression */}
          {progression && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <GitBranch className="h-5 w-5 text-indigo-600" />
                <h2 className="font-display font-semibold text-refinery-navy">Logical Progression</h2>
              </div>

              {/* Chapter connection flow */}
              <div className="space-y-3 mb-6">
                {(progression.chapter_connections || []).map((conn, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 min-w-[120px] text-center">
                      {conn.from_chapter || `Ch ${conn.from}`}
                    </div>
                    <div className="flex-1 flex items-center">
                      <div className={`flex-1 h-1 rounded ${strengthDot(conn.connection_strength)}`}></div>
                      <div className="mx-2">
                        <span className={`text-xs px-2 py-1 rounded-full border ${strengthColor(conn.connection_strength)}`}>
                          {conn.connection_strength}
                        </span>
                      </div>
                      <div className={`flex-1 h-1 rounded ${strengthDot(conn.connection_strength)}`}></div>
                    </div>
                    <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 min-w-[120px] text-center">
                      {conn.to_chapter || `Ch ${conn.to}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stall Points */}
              {(progression.stall_points || []).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Stall Points</h3>
                  <div className="space-y-2">
                    {progression.stall_points.map((point, i) => (
                      <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-700">{point.location}</p>
                        <p className="text-sm text-slate-700 mt-1">{point.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contradiction Points */}
              {(progression.contradiction_points || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Contradiction Points</h3>
                  <div className="space-y-2">
                    {progression.contradiction_points.map((point, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-red-700">{point.location}</p>
                        <p className="text-sm text-slate-700 mt-1">{point.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Counterargument Coverage */}
          {counterarguments && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-purple-600" />
                <h2 className="font-display font-semibold text-refinery-navy">Counterargument Coverage</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="pb-2 pr-4">Counterargument</th>
                      <th className="pb-2 pr-4">How Addressed</th>
                      <th className="pb-2 pr-4">Adequacy</th>
                      <th className="pb-2">Suggestion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(counterarguments.items || []).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 text-slate-700 max-w-xs">{item.counterargument}</td>
                        <td className="py-3 pr-4">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            {item.how_addressed}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${adequacyBadge(item.adequacy)}`}>
                            {item.adequacy}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 text-xs max-w-sm">{item.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(counterarguments.items || []).length === 0 && (
                <p className="text-sm text-slate-500 mt-2">No counterarguments identified in the manuscript.</p>
              )}
            </div>
          )}

          {/* Chapter Coherence Scores - Horizontal Bar Chart */}
          {chapterBarData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <h2 className="font-display font-semibold text-refinery-navy mb-4">Chapter Coherence Scores</h2>
              <ResponsiveContainer width="100%" height={Math.max(200, chapterBarData.length * 45)}>
                <BarChart data={chapterBarData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="chapter" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}/100`, 'Coherence']} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chapterBarData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary */}
          {results.summary && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <h2 className="font-display font-semibold text-refinery-navy mb-2">Summary</h2>
              <p className="text-sm text-slate-700 whitespace-pre-line">{results.summary}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
