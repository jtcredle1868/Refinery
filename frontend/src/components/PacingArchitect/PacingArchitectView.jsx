import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Zap, Heart, Play, Pause } from 'lucide-react';
import {
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';

export default function PacingArchitectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manuscript, setManuscript] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        getManuscript(id),
        getManuscriptAnalyses(id),
      ]);
      setManuscript(mRes.data);
      const pacing = aRes.data.find(
        (a) => a.analysis_type === 'pacing_architect' && a.status === 'completed'
      );
      if (pacing && pacing.results_json) {
        setResults(JSON.parse(pacing.results_json));
      }
    } catch (_err) {
      setError('Failed to load manuscript data');
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
      await runAnalysis(parseInt(id), 'pacing_architect');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Pacing analysis failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-plum"></div>
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="text-center py-20 text-ink/60">Manuscript not found</div>
    );
  }

  // Build tension curve chart data from tension_values array
  const tensionCurveData = (results?.tension_values || []).map((value, idx) => ({
    chapter: idx + 1,
    tension: value,
  }));

  // Build chapter beats chart and table data
  const chapterBeats = results?.chapter_beats || [];
  const chapterBeatsChartData = chapterBeats.map((beat) => ({
    chapter: beat.chapter_number || beat.chapter,
    title: beat.title || `Ch ${beat.chapter_number || beat.chapter}`,
    action: beat.action_density,
    emotion: beat.emotional_depth,
    tension: beat.tension_level,
  }));

  // Score color helper
  const scoreColor = (score) => {
    if (score >= 80) return 'text-plum';
    if (score >= 60) return 'text-ember';
    return 'text-red-600';
  };

  // Badge color helper for beat type
  const beatBadge = (type) => {
    const t = (type || '').toUpperCase();
    if (t === 'ACTION') return 'bg-blue-100 text-blue-700';
    if (t === 'EMOTION') return 'bg-pink-100 text-pink-700';
    if (t === 'TRANSITION') return 'bg-amber-100 text-amber-700';
    return 'bg-ink/10 text-ink/70';
  };

  return (
    <div>
      {/* Navigation */}
      <button
        onClick={() => navigate(`/manuscript/${id}`)}
        className="flex items-center text-plum hover:underline mb-6 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </button>

      {/* Page title */}
      <div className="flex items-center space-x-3 mb-2">
        <Activity className="h-8 w-8 text-plum" />
        <h1 className="text-3xl font-display text-ink">
          Pacing Architect
        </h1>
      </div>
      <p className="text-ink/60 mb-6">
        Pacing analysis for{' '}
        <span className="font-medium text-ink">
          {manuscript.title}
        </span>
      </p>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* No results -- show run button */}
      {!results && (
        <div className="rounded-3xl border border-ink/10 bg-white/90 p-12 text-center">
          <Activity className="h-12 w-12 text-ink/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">
            No Pacing Analysis Yet
          </h2>
          <p className="text-sm text-ink/60 mb-6 max-w-md mx-auto">
            Run the Pacing Architect to analyze tension curves, chapter beats,
            action/emotion density, and act structure across your manuscript.
          </p>
          <button
            onClick={handleRunAnalysis}
            disabled={running}
            className="inline-flex items-center space-x-2 bg-ink text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition"
          >
            {running ? (
              <>
                <Pause className="h-4 w-4 animate-pulse" />
                <span>Running Pacing Analysis...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Pacing Analysis</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Header stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pacing Score */}
            {results.pacing_score !== undefined && (
              <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="h-5 w-5 text-ember" />
                  <span className="text-sm font-medium text-ink/60">
                    Pacing Score
                  </span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span
                    className={`text-4xl font-bold ${scoreColor(results.pacing_score)}`}
                  >
                    {results.pacing_score}
                  </span>
                  <span className="text-sm text-ink/40">/100</span>
                </div>
              </div>
            )}

            {/* Act Structure */}
            {results.act_structure && (
              <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Activity className="h-5 w-5 text-plum" />
                  <span className="text-sm font-medium text-ink/60">
                    Act Structure
                  </span>
                </div>
                <span className="text-2xl font-bold text-ink">
                  {results.act_structure.type || results.act_structure.detected_structure || 'N/A'}
                </span>
              </div>
            )}

            {/* Tension Curve Shape */}
            {results.tension_curve_shape && (
              <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <span className="text-sm font-medium text-ink/60">
                    Tension Curve
                  </span>
                </div>
                <span className="text-2xl font-bold text-ink capitalize">
                  {results.tension_curve_shape}
                </span>
              </div>
            )}
          </div>

          {/* Tension Curve Chart */}
          {tensionCurveData.length > 0 && (
            <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
              <h2 className="font-semibold text-ink mb-1">
                Tension Curve
              </h2>
              <p className="text-sm text-ink/60 mb-4">
                Overall tension level across chapters
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={tensionCurveData}>
                  <defs>
                    <linearGradient id="tensionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="chapter"
                    label={{ value: 'Chapter', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Tension',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [value, 'Tension']}
                    labelFormatter={(label) => `Chapter ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="tension"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#tensionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chapter Beats Chart */}
          {chapterBeatsChartData.length > 0 && (
            <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
              <h2 className="font-semibold text-ink mb-1">
                Chapter Beats
              </h2>
              <p className="text-sm text-ink/60 mb-4">
                Action density, emotional depth, and tension per chapter
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chapterBeatsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="chapter"
                    label={{ value: 'Chapter', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Intensity (0-10)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '13px',
                    }}
                    labelFormatter={(label) => `Chapter ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey="action"
                    name="Action Density"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    dataKey="emotion"
                    name="Emotional Depth"
                    fill="#ec4899"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Line
                    type="monotone"
                    dataKey="tension"
                    name="Tension Level"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chapter Beats Table */}
          {chapterBeats.length > 0 && (
            <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
              <h2 className="font-semibold text-ink mb-4">
                Chapter Beats Detail
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10">
                      <th className="text-left py-3 px-3 font-medium text-ink/60">
                        Chapter
                      </th>
                      <th className="text-left py-3 px-3 font-medium text-ink/60">
                        Title
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-ink/60">
                        Action (0-10)
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-ink/60">
                        Emotion (0-10)
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-ink/60">
                        Tension (0-10)
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-ink/60">
                        Beat Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapterBeats.map((beat, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-ink/5 transition"
                      >
                        <td className="py-3 px-3 font-medium text-ink">
                          {beat.chapter_number || beat.chapter}
                        </td>
                        <td className="py-3 px-3 text-ink/80">
                          {beat.title || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block min-w-[2rem] text-center font-medium text-blue-700 bg-blue-50 rounded px-2 py-0.5">
                            {beat.action_density}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block min-w-[2rem] text-center font-medium text-pink-700 bg-pink-50 rounded px-2 py-0.5">
                            {beat.emotional_depth}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block min-w-[2rem] text-center font-medium text-amber-700 bg-amber-50 rounded px-2 py-0.5">
                            {beat.tension_level}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${beatBadge(beat.beat_type)}`}
                          >
                            {(beat.beat_type || 'N/A').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pacing Flags */}
          {((results.pacing_flags?.breathing_space_flags || []).length > 0 ||
            (results.pacing_flags?.slow_zone_flags || []).length > 0) && (
            <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
              <h2 className="font-semibold text-ink mb-4">
                Pacing Flags
              </h2>

              {/* Breathing Space Flags */}
              {(results.pacing_flags?.breathing_space_flags || []).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-ink/80 mb-3 flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span>Breathing Space Needed</span>
                    <span className="text-xs text-ink/40 font-normal">
                      (high-action sequences without relief)
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {results.pacing_flags.breathing_space_flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                            Chapters {flag.start_chapter}&#8211;{flag.end_chapter}
                          </span>
                        </div>
                        <p className="text-sm text-ink/80 mb-1">
                          {flag.description}
                        </p>
                        {flag.suggestion && (
                          <p className="text-sm text-orange-700 italic">
                            {flag.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slow Zone Flags */}
              {(results.pacing_flags?.slow_zone_flags || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-ink/80 mb-3 flex items-center space-x-2">
                    <Pause className="h-4 w-4 text-blue-500" />
                    <span>Slow Zones Detected</span>
                    <span className="text-xs text-ink/40 font-normal">
                      (sustained low-energy stretches)
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {results.pacing_flags.slow_zone_flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Chapters {flag.start_chapter}&#8211;{flag.end_chapter}
                          </span>
                        </div>
                        <p className="text-sm text-ink/80 mb-1">
                          {flag.description}
                        </p>
                        {flag.suggestion && (
                          <p className="text-sm text-blue-700 italic">
                            {flag.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Act Structure Detail */}
          {results.act_structure && (
            <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
              <h2 className="font-semibold text-ink mb-4">
                Act Structure
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-ink/60 mb-1">
                    Detected Structure
                  </p>
                  <p className="text-lg font-bold text-ink">
                    {results.act_structure.type || results.act_structure.detected_structure || 'N/A'}
                  </p>
                </div>
                {(results.act_structure.act_breaks || []).length > 0 && (
                  <div>
                    <p className="text-sm text-ink/60 mb-2">
                      Act Break Chapters
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {results.act_structure.act_breaks.map((chapterNum, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center justify-center bg-ink text-white text-sm font-medium rounded-full w-10 h-10"
                        >
                          {chapterNum}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {results.summary && (
            <div className="border border-ink/10 bg-white/90 rounded-xl p-6">
              <h2 className="font-semibold text-ink mb-2">
                Summary
              </h2>
              <p className="text-sm text-ink/80 whitespace-pre-line">
                {results.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
