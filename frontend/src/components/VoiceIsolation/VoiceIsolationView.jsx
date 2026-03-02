import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  Users,
  AlertTriangle,
  Loader,
  Play,
  MessageSquare,
  Fingerprint,
  ShieldAlert,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  getManuscript,
  getManuscriptAnalyses,
  runAnalysis,
} from '../../services/api';

function SeverityBadge({ level }) {
  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        styles[level] || 'bg-ink/10 text-ink/70'
      }`}
    >
      {level}
    </span>
  );
}

function VoiceRadarChart({ fingerprint }) {
  if (!fingerprint) return null;

  const data = [
    {
      trait: 'Formality',
      value: fingerprint.formality_score ?? 0,
      fullMark: 10,
    },
    {
      trait: 'Vocabulary',
      value: (fingerprint.vocabulary_richness ?? 0) * 10,
      fullMark: 10,
    },
    {
      trait: 'Sentence Length',
      value: Math.min((fingerprint.avg_sentence_length ?? 0) / 3, 10),
      fullMark: 10,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="trait"
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <Tooltip
          formatter={(value) => value.toFixed(1)}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Radar
          name="Voice"
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function CharacterCard({ character }) {
  const [expanded, setExpanded] = useState(false);
  const fp = character.voice_fingerprint || {};

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
      {/* Character header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">
            {character.name}
          </h3>
          <div className="flex items-center space-x-3 mt-1">
            {character.role && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                {character.role}
              </span>
            )}
            {character.dialogue_count !== undefined && (
              <span className="text-xs text-ink/60">
                <MessageSquare className="inline h-3 w-3 mr-1" />
                {character.dialogue_count} dialogue lines
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Voice fingerprint stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-ink/5 rounded-lg p-3">
          <p className="text-xs text-ink/60">Avg Sentence Length</p>
          <p className="text-lg font-bold text-ink">
            {fp.avg_sentence_length?.toFixed(1) ?? '--'}
          </p>
        </div>
        <div className="bg-ink/5 rounded-lg p-3">
          <p className="text-xs text-ink/60">Vocabulary Richness</p>
          <p className="text-lg font-bold text-ink">
            {fp.vocabulary_richness?.toFixed(2) ?? '--'}
          </p>
        </div>
        <div className="bg-ink/5 rounded-lg p-3">
          <p className="text-xs text-ink/60">Register</p>
          <p className="text-sm font-semibold text-ink capitalize">
            {fp.register ?? '--'}
          </p>
        </div>
        <div className="bg-ink/5 rounded-lg p-3">
          <p className="text-xs text-ink/60">Formality Score</p>
          <p className="text-lg font-bold text-ink">
            {fp.formality_score?.toFixed(1) ?? '--'}
            <span className="text-xs text-ink/40 font-normal">/10</span>
          </p>
        </div>
      </div>

      {/* Radar chart */}
      <VoiceRadarChart fingerprint={fp} />

      {/* Speech patterns */}
      {character.speech_patterns && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-ink/60 uppercase tracking-wide mb-1">
            Speech Patterns
          </h4>
          <p className="text-sm text-ink/80">{character.speech_patterns}</p>
        </div>
      )}

      {/* Sample dialogue */}
      {character.sample_dialogue && character.sample_dialogue.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-plum hover:underline mb-2"
          >
            {expanded ? 'Hide' : 'Show'} sample dialogue (
            {character.sample_dialogue.length})
          </button>
          {expanded && (
            <div className="space-y-2">
              {character.sample_dialogue.slice(0, 3).map((line, i) => (
                <div
                  key={i}
                  className="bg-ink/5 rounded-md p-3 text-sm text-ink/80 italic border-l-2 border-plum"
                >
                  &ldquo;{line}&rdquo;
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimilarityMatrix({ matrix }) {
  if (!matrix || matrix.length === 0) return null;

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Users className="h-5 w-5 text-plum" />
        <h2 className="font-semibold text-ink">
          Voice Similarity Matrix
        </h2>
      </div>
      <p className="text-xs text-ink/60 mb-4">
        Pairs with similarity above 60% are flagged as potential voice blending
        risks.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink/60 border-b border-ink/10">
              <th className="pb-2 pr-4">Character A</th>
              <th className="pb-2 pr-4">Character B</th>
              <th className="pb-2 pr-4 text-right">Similarity</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {matrix.map((pair, i) => {
              const score = pair.similarity_score ?? pair.similarity ?? 0;
              const flagged = score > 60;
              return (
                <tr
                  key={i}
                  className={flagged ? 'bg-red-50' : 'hover:bg-ink/5'}
                >
                  <td className="py-2.5 pr-4 font-medium text-ink">
                    {pair.character_a}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-ink">
                    {pair.character_b}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span
                      className={`font-bold ${
                        flagged ? 'text-red-500' : 'text-green-500'
                      }`}
                    >
                      {score}%
                    </span>
                  </td>
                  <td className="py-2.5">
                    {flagged ? (
                      <span className="inline-flex items-center space-x-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Flagged</span>
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">
                        Distinct
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JargonBleedSection({ characters }) {
  const allBleedItems = (characters || []).flatMap((char) =>
    (char.jargon_bleed || []).map((item) => ({
      ...item,
      character: char.name,
    }))
  );

  if (allBleedItems.length === 0) return null;

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h2 className="font-semibold text-ink">
          Jargon Bleed ({allBleedItems.length} instances)
        </h2>
      </div>
      <p className="text-xs text-ink/60 mb-4">
        Instances where specialized language bleeds between characters or breaks
        voice consistency.
      </p>
      <div className="space-y-3 max-h-96 overflow-auto">
        {allBleedItems.map((item, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-amber-200 bg-amber-50"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-ink">
                  {item.character}
                </span>
                {item.chapter && (
                  <span className="text-xs text-ink/60">
                    {item.chapter}
                  </span>
                )}
              </div>
              {item.jargon_type && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-medium">
                  {item.jargon_type}
                </span>
              )}
            </div>
            {item.passage && (
              <p className="text-sm text-ink/80 italic mb-1">
                &ldquo;{item.passage}&rdquo;
              </p>
            )}
            {item.reason && (
              <p className="text-xs text-amber-700">{item.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VoiceIsolationView() {
  const { id } = useParams();
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
      const voiceAnalysis = aRes.data.find(
        (a) => a.analysis_type === 'voice_isolation' && a.status === 'completed'
      );
      if (voiceAnalysis && voiceAnalysis.results_json) {
        setResults(JSON.parse(voiceAnalysis.results_json));
      }
    } catch (_err) {
      setError('Failed to load manuscript data.');
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
      await runAnalysis(parseInt(id), 'voice_isolation');
      await load();
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Voice isolation analysis failed.'
      );
    } finally {
      setRunning(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-plum"></div>
      </div>
    );
  }

  // No manuscript found
  if (!manuscript) {
    return (
      <div className="text-center py-20">
        <p className="text-ink/60">Manuscript not found.</p>
        <Link
          to="/dashboard"
          className="text-plum mt-2 inline-block hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Determine header stats from results
  const voiceScore = results?.voice_score;
  const characters = results?.characters || [];
  const similarityMatrix = results?.similarity_matrix || [];
  const summary = results?.summary;

  const mostDistinctive = results?.most_distinctive_character;
  const leastDistinctive = results?.least_distinctive_character;

  return (
    <div>
      {/* Back navigation */}
      <Link
        to={`/manuscript/${id}`}
        className="flex items-center text-plum hover:underline mb-6 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </Link>

      {/* Page title */}
      <div className="flex items-center space-x-3 mb-2">
        <Mic className="h-8 w-8 text-plum" />
        <h1 className="text-3xl font-display text-ink">
          Voice Isolation Lab
        </h1>
      </div>
      <p className="text-ink/60 mb-6">
        Character voice distinctiveness analysis for{' '}
        <span className="font-medium text-ink">
          {manuscript.title}
        </span>
      </p>

      {/* Error banner */}
      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* No results -- show run button */}
      {!results && !running && (
        <div className="rounded-3xl border border-ink/10 bg-white/90 p-10 text-center">
          <Fingerprint className="h-12 w-12 text-ink/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">
            No voice analysis found
          </h2>
          <p className="text-sm text-ink/60 mb-6 max-w-md mx-auto">
            Run the Voice Isolation analysis to examine how distinct each
            character's voice is, detect similarity risks, and identify jargon
            bleed across your manuscript.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="inline-flex items-center space-x-2 bg-ink text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-ink/80 transition"
          >
            <Play className="h-4 w-4" />
            <span>Run Voice Analysis</span>
          </button>
        </div>
      )}

      {/* Running state */}
      {running && (
        <div className="rounded-3xl border border-ink/10 bg-white/90 p-10 text-center">
          <Loader className="h-10 w-10 text-plum animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">
            Analyzing character voices...
          </h2>
          <p className="text-sm text-ink/60">
            This may take a minute. Examining dialogue patterns, vocabulary, and
            voice fingerprints.
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Header scoreboard */}
          <div className="border border-ink/10 bg-white/90 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Voice score */}
              <div className="text-center">
                <p className="text-xs text-ink/60 uppercase tracking-wide mb-1">
                  Voice Distinctiveness Score
                </p>
                <p className="text-5xl font-bold text-ink">
                  {voiceScore ?? '--'}
                </p>
                <p className="text-sm text-ink/40 mt-1">/100</p>
              </div>

              {/* Most distinctive */}
              <div className="text-center">
                <p className="text-xs text-ink/60 uppercase tracking-wide mb-1">
                  Most Distinctive
                </p>
                <p className="text-xl font-semibold text-green-600">
                  {mostDistinctive || '--'}
                </p>
              </div>

              {/* Least distinctive */}
              <div className="text-center">
                <p className="text-xs text-ink/60 uppercase tracking-wide mb-1">
                  Least Distinctive
                </p>
                <p className="text-xl font-semibold text-red-500">
                  {leastDistinctive || '--'}
                </p>
              </div>
            </div>
          </div>

          {/* Re-run button */}
          <div className="flex justify-end">
            <button
              onClick={handleRunAnalysis}
              disabled={running}
              className="inline-flex items-center space-x-2 bg-ink text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition"
            >
              {running ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Re-run Voice Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* Character cards */}
          {characters.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-plum" />
                <h2 className="text-xl font-semibold text-ink">
                  Character Voices ({characters.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {characters.map((char, i) => (
                  <CharacterCard key={i} character={char} />
                ))}
              </div>
            </div>
          )}

          {/* Similarity matrix */}
          <SimilarityMatrix matrix={similarityMatrix} />

          {/* Jargon bleed */}
          <JargonBleedSection characters={characters} />

          {/* Summary */}
          {summary && (
            <div className="border border-ink/10 bg-white/90 rounded-xl p-6">
              <h2 className="font-semibold text-ink mb-2">
                Analysis Summary
              </h2>
              <p className="text-sm text-ink/80 whitespace-pre-line">
                {summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
