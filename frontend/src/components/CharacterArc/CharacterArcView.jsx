import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Heart, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';

export default function CharacterArcView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manuscript, setManuscript] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [expandedCharacter, setExpandedCharacter] = useState(0);

  const load = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        getManuscript(id),
        getManuscriptAnalyses(id),
      ]);
      setManuscript(mRes.data);
      const arc = aRes.data.find(
        (a) => a.analysis_type === 'character_arc' && a.status === 'completed'
      );
      if (arc && arc.results_json) {
        const parsed = typeof arc.results_json === 'string'
          ? JSON.parse(arc.results_json)
          : arc.results_json;
        setResults(parsed);
      }
    } catch (_err) {
      setError('Failed to load manuscript or analysis data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleRunAnalysis = async () => {
    setRunning(true);
    setError('');
    try {
      await runAnalysis(parseInt(id), 'character_arc');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Character arc analysis failed.');
    } finally {
      setRunning(false);
    }
  };

  /* ---------- Role badge color mapping ---------- */
  const roleBadge = (role) => {
    const map = {
      protagonist: 'bg-blue-100 text-blue-700',
      antagonist: 'bg-red-100 text-red-700',
      supporting: 'bg-amber-100 text-amber-700',
      minor: 'bg-ink/10 text-ink/70',
    };
    return map[role?.toLowerCase()] || 'bg-ink/10 text-ink/70';
  };

  /* ---------- Severity badge color mapping ---------- */
  const severityBadge = (severity) => {
    const map = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-ink/10 text-ink/70',
    };
    return map[severity?.toLowerCase()] || 'bg-ink/10 text-ink/70';
  };

  /* ---------- Relationship type badge ---------- */
  const relationshipBadge = (type) => {
    const map = {
      romantic: 'bg-pink-100 text-pink-700',
      antagonistic: 'bg-red-100 text-red-700',
      mentor: 'bg-indigo-100 text-indigo-700',
      rivalry: 'bg-orange-100 text-orange-700',
      familial: 'bg-emerald-100 text-emerald-700',
      friendship: 'bg-sky-100 text-sky-700',
      alliance: 'bg-teal-100 text-teal-700',
    };
    return map[type?.toLowerCase()] || 'bg-ink/10 text-ink/70';
  };

  /* ---------- Loading state ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-plum"></div>
      </div>
    );
  }

  /* ---------- No manuscript ---------- */
  if (!manuscript) {
    return (
      <div className="text-center py-20 text-ink/60">Manuscript not found.</div>
    );
  }

  const characters = results?.characters || [];
  const relationships = results?.relationship_dynamics || [];

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate(`/manuscript/${id}`)}
        className="flex items-center text-plum hover:underline mb-6 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </button>

      {/* Title */}
      <div className="flex items-center space-x-3 mb-2">
        <Users className="h-8 w-8 text-plum" />
        <h1 className="text-3xl font-display text-ink">
          Character Arc Workshop
        </h1>
      </div>
      <p className="text-ink/60 mb-6">
        Character development tracking for <span className="font-medium text-ink">{manuscript.title}</span>
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Run analysis button */}
      <button
        onClick={handleRunAnalysis}
        disabled={running}
        className="flex items-center space-x-2 bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition mb-8"
      >
        {running ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Running Character Arc Analysis...</span>
          </>
        ) : (
          <>
            <Users className="h-4 w-4" />
            <span>{results ? 'Re-run Character Arc Analysis' : 'Run Character Arc Analysis'}</span>
          </>
        )}
      </button>

      {/* No results yet */}
      {!results && !running && (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-ink/40 mx-auto mb-3" />
          <p className="text-ink/60">No character arc analysis results yet. Run the analysis to get started.</p>
        </div>
      )}

      {/* ---------- Results ---------- */}
      {results && (
        <div className="space-y-8">
          {/* Header: Score + Character Count */}
          <div className="border border-ink/10 bg-white/90 rounded-xl p-6 flex flex-wrap items-center gap-8">
            {results.character_score !== undefined && (
              <div>
                <span className="text-sm text-ink/70">Character Score: </span>
                <span className="text-3xl font-bold text-ink">{results.character_score}</span>
                <span className="text-sm text-ink/60">/100</span>
              </div>
            )}
            <div>
              <span className="text-sm text-ink/70">Characters Tracked: </span>
              <span className="text-3xl font-bold text-ink">{characters.length}</span>
            </div>
          </div>

          {/* ---------- Character Cards ---------- */}
          {characters.length > 0 && (
            <div>
              <h2 className="text-lg font-display text-ink mb-4">Characters</h2>
              <div className="space-y-4">
                {characters.map((char, idx) => {
                  const isExpanded = expandedCharacter === idx;
                  const chapterData = (char.chapter_tracking || []).map((ct) => ({
                    chapter: ct.chapter ?? ct.chapter_number,
                    presence: 1,
                  }));

                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-ink/10 bg-white/90 overflow-hidden"
                    >
                      {/* Card header (always visible, clickable) */}
                      <button
                        onClick={() => setExpandedCharacter(isExpanded ? null : idx)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-ink/5 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-ink text-lg">
                            {char.name}
                          </h3>
                          {char.role && (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${roleBadge(char.role)}`}>
                              {char.role}
                            </span>
                          )}
                          {char.arc_type && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                              {char.arc_type}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`h-5 w-5 text-ink/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-6 pb-6 space-y-6 border-t border-slate-100 pt-4">
                          {/* Core traits: Want / Fear / Belief / Arc Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {char.want && (
                              <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-xs font-medium text-blue-600 mb-1">Want</p>
                                <p className="text-sm text-ink/80">{char.want}</p>
                              </div>
                            )}
                            {char.fear && (
                              <div className="bg-red-50 rounded-lg p-4">
                                <p className="text-xs font-medium text-red-600 mb-1">Fear</p>
                                <p className="text-sm text-ink/80">{char.fear}</p>
                              </div>
                            )}
                            {char.belief && (
                              <div className="bg-amber-50 rounded-lg p-4">
                                <p className="text-xs font-medium text-amber-600 mb-1">Belief</p>
                                <p className="text-sm text-ink/80">{char.belief}</p>
                              </div>
                            )}
                            {char.arc_summary && (
                              <div className="bg-indigo-50 rounded-lg p-4">
                                <p className="text-xs font-medium text-indigo-600 mb-1">Arc Summary</p>
                                <p className="text-sm text-ink/80">{char.arc_summary}</p>
                              </div>
                            )}
                          </div>

                          {/* Chapter Tracking Timeline */}
                          {chapterData.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-ink/80 mb-2">Chapter Tracking Timeline</h4>
                              <div className="bg-ink/5 rounded-lg p-4">
                                <ResponsiveContainer width="100%" height={120}>
                                  <LineChart data={chapterData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                      dataKey="chapter"
                                      tick={{ fontSize: 12 }}
                                      label={{ value: 'Chapter', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                      formatter={() => ['Present', 'Status']}
                                      labelFormatter={(label) => `Chapter ${label}`}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="presence"
                                      stroke="#5f2d82"
                                      strokeWidth={2}
                                      dot={{ r: 4, fill: '#3b82f6' }}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* Inconsistencies */}
                          {char.inconsistencies && char.inconsistencies.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-ink/80 mb-2 flex items-center space-x-1">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span>Inconsistencies ({char.inconsistencies.length})</span>
                              </h4>
                              <div className="space-y-3">
                                {char.inconsistencies.map((inc, i) => (
                                  <div
                                    key={i}
                                    className={`p-4 rounded-lg border ${
                                      inc.severity === 'high'
                                        ? 'border-red-200 bg-red-50'
                                        : inc.severity === 'medium'
                                        ? 'border-yellow-200 bg-yellow-50'
                                        : 'border-ink/10 bg-ink/5'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm font-medium text-slate-800">{inc.description}</p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(inc.severity)}`}>
                                        {inc.severity}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                      {inc.expected && (
                                        <div>
                                          <span className="text-xs font-medium text-ink/60">Expected: </span>
                                          <span className="text-ink/80">{inc.expected}</span>
                                        </div>
                                      )}
                                      {inc.actual && (
                                        <div>
                                          <span className="text-xs font-medium text-ink/60">Actual: </span>
                                          <span className="text-ink/80">{inc.actual}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-2 flex items-center space-x-1">
                                      {inc.justified ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      )}
                                      <span className="text-xs text-ink/60">
                                        {inc.justified ? 'Justified' : 'Not justified'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Transformation Validation */}
                          {char.transformation_validation && (
                            <div>
                              <h4 className="text-sm font-medium text-ink/80 mb-2">Transformation Validation</h4>
                              <div className="bg-white rounded-lg border border-ink/10 p-4 space-y-3">
                                {char.transformation_validation.climax_chapter !== undefined && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-ink/60">Climax Chapter:</span>
                                    <span className="text-sm font-semibold text-ink">
                                      {char.transformation_validation.climax_chapter}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-ink/60">Change Earned:</span>
                                  {char.transformation_validation.change_earned ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-500" />
                                  )}
                                  <span className="text-sm text-ink/80">
                                    {char.transformation_validation.change_earned ? 'Yes' : 'No'}
                                  </span>
                                </div>

                                {char.transformation_validation.earning_evidence && (
                                  <div>
                                    <span className="text-xs font-medium text-ink/60">Earning Evidence:</span>
                                    <p className="text-sm text-ink/80 mt-1">
                                      {char.transformation_validation.earning_evidence}
                                    </p>
                                  </div>
                                )}

                                {char.transformation_validation.missing_setup &&
                                  char.transformation_validation.missing_setup.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-ink/60">Missing Setup:</span>
                                      <ul className="mt-1 space-y-1">
                                        {char.transformation_validation.missing_setup.map((item, i) => (
                                          <li key={i} className="flex items-start space-x-2 text-sm text-ink/80">
                                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------- Relationship Dynamics ---------- */}
          {relationships.length > 0 && (
            <div>
              <h2 className="text-lg font-display text-ink mb-4 flex items-center space-x-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <span>Relationship Dynamics</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relationships.map((rel, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-ink/10 bg-white/90 p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-ink">{rel.character_a}</span>
                        <span className="text-ink/40">&harr;</span>
                        <span className="font-medium text-ink">{rel.character_b}</span>
                      </div>
                      {rel.relationship_type && (
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${relationshipBadge(rel.relationship_type)}`}>
                          {rel.relationship_type}
                        </span>
                      )}
                    </div>

                    {rel.evolution && (
                      <p className="text-sm text-ink/70 mb-3">{rel.evolution}</p>
                    )}

                    {rel.key_scenes && rel.key_scenes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-ink/60 mb-1">Key Scenes</p>
                        <ul className="space-y-1">
                          {rel.key_scenes.map((scene, i) => (
                            <li key={i} className="text-sm text-ink/70 flex items-start space-x-2">
                              <span className="text-ink/40 mt-1">&bull;</span>
                              <span>{scene}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- Summary ---------- */}
          {results.summary && (
            <div className="border border-ink/10 bg-white/90 rounded-xl p-6">
              <h2 className="font-semibold text-ink mb-2">Summary</h2>
              <p className="text-sm text-ink/80 whitespace-pre-line">{results.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
