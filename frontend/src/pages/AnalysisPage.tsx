import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getManuscript, getAnalysisResult } from '../services/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-40 capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-3">
        <div className={`h-3 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-700 w-12 text-right">{score}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config[severity] || ''}`}>
      {severity}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// --- Module-specific renderers ---

function ManuscriptIntelligence({ data }: { data: any }) {
  const summary = data.summary || {};
  const charCensus = data.character_census || [];
  const dupDetection = data.duplicate_detection || {};
  const metaphorData = data.metaphor_density_heatmap || [];
  const lexical = data.lexical_fingerprint || {};

  return (
    <>
      <Section title="Summary Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold text-slate-900">{typeof value === 'number' ? (value as number).toLocaleString() : String(value)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Character Census">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Character</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Role</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Mentions</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">First Appearance</th>
              </tr>
            </thead>
            <tbody>
              {charCensus.map((c: any, i: number) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-medium text-slate-900">{c.name}</td>
                  <td className="py-2 px-3 text-slate-600">{c.role}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{c.mentions}</td>
                  <td className="py-2 px-3 text-slate-600">{c.first_appearance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {dupDetection.sections?.length > 0 && (
        <Section title="Duplicate Detection">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-700">
              Found {dupDetection.duplicates_found} duplicate section(s) ({dupDetection.duplicate_percentage}% of total content)
            </p>
          </div>
          {dupDetection.sections.map((dup: any, i: number) => (
            <div key={i} className="bg-slate-50 rounded-lg p-4 mb-2">
              <p className="text-sm text-slate-700 italic">"{dup.text_snippet}"</p>
              <p className="text-xs text-slate-500 mt-2">
                Similarity: {(dup.similarity_score * 100).toFixed(0)}% | Locations: {dup.locations.map((l: any) => `Ch.${l.chapter} P.${l.paragraph}`).join(', ')}
              </p>
            </div>
          ))}
        </Section>
      )}

      {metaphorData.length > 0 && (
        <Section title="Metaphor Density Heatmap">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metaphorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="chapter" label={{ value: 'Chapter', position: 'bottom' }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="metaphor_count" fill="#6366f1" name="Metaphors" />
              <Bar dataKey="simile_count" fill="#a78bfa" name="Similes" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      <Section title="Lexical Fingerprint">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Top Words</h4>
            {lexical.top_words?.map((w: any, i: number) => (
              <div key={i} className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-sm text-slate-600">{w.word}</span>
                <span className="text-sm font-medium text-slate-800">{w.count}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Vocabulary Richness</p>
              <p className="text-lg font-semibold">{lexical.vocabulary_richness}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Readability Score</p>
              <p className="text-lg font-semibold">{lexical.readability_score}</p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function VoiceIsolation({ data }: { data: any }) {
  const profiles = data.voice_profiles || [];
  const jargon = data.jargon_bleed_detection || [];

  return (
    <>
      <Section title="Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.summary || {}).map(([key, value]) => (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      </Section>

      {profiles.map((profile: any, i: number) => (
        <Section key={i} title={`Voice Profile: ${profile.character}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Dialogue Words</p>
              <p className="font-semibold">{profile.dialogue_word_count.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Formality</p>
              <p className="font-semibold">{(profile.formality_score * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Vocabulary Complexity</p>
              <p className="font-semibold">{(profile.vocabulary_complexity * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-1">Signature Phrases</p>
            <div className="flex flex-wrap gap-2">
              {profile.signature_phrases?.map((p: string, j: number) => (
                <span key={j} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-sm">"{p}"</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Sample Dialogue</p>
            {profile.sample_lines?.map((line: string, j: number) => (
              <p key={j} className="text-sm text-slate-600 italic border-l-2 border-indigo-200 pl-3 mb-1">{line}</p>
            ))}
          </div>
        </Section>
      ))}

      {jargon.length > 0 && (
        <Section title="Jargon Bleed Detection">
          {jargon.map((item: any, i: number) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
              <p className="text-sm text-amber-800">
                <strong>"{item.term}"</strong> used by {item.found_in_speech_of} but expected from {item.expected_speaker}
              </p>
              <p className="text-xs text-amber-600 mt-1">Chapter {item.chapter} | Severity: {item.severity}</p>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

function PacingArchitect({ data }: { data: any }) {
  const pulse = data.pulse_graph || {};
  const slowZones = data.slow_zones || [];
  const tensionCurve = data.tension_curve || [];

  const chartData = pulse.labels?.map((label: string, i: number) => ({
    name: label,
    Action: Math.round((pulse.action?.[i] || 0) * 100),
    Emotion: Math.round((pulse.emotion?.[i] || 0) * 100),
    Tension: Math.round((pulse.tension?.[i] || 0) * 100),
  })) || [];

  return (
    <>
      <Section title="Summary">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(data.summary || {}).map(([key, value]) => (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pulse Graph">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Action" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="Emotion" stroke="#ec4899" strokeWidth={2} />
            <Line type="monotone" dataKey="Tension" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Tension Curve">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={tensionCurve.map((t: any) => ({ name: `Ch ${t.chapter}`, tension: Math.round(t.tension * 100) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="tension" stroke="#ef4444" strokeWidth={3} fill="#fee2e2" />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {slowZones.length > 0 && (
        <Section title="Slow Zones">
          {slowZones.map((sz: any, i: number) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={sz.severity} />
                <span className="text-sm font-medium text-slate-700">Chapter {sz.chapter}</span>
              </div>
              <p className="text-sm text-slate-600">{sz.reason}</p>
              <p className="text-sm text-indigo-600 mt-1">{sz.suggestion}</p>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

function CharacterArc({ data }: { data: any }) {
  const arcs = data.character_arcs || [];
  const alternatives = data.alternative_arcs || [];

  return (
    <>
      <Section title="Summary">
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(data.summary || {}).map(([key, value]) => (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      </Section>

      {arcs.map((arc: any, i: number) => (
        <Section key={i} title={`${arc.character} - ${arc.arc_type}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div><p className="text-xs text-slate-500">Want</p><p className="text-sm text-slate-800">{arc.want}</p></div>
              <div><p className="text-xs text-slate-500">Fear</p><p className="text-sm text-slate-800">{arc.fear}</p></div>
              <div><p className="text-xs text-slate-500">Core Belief</p><p className="text-sm text-slate-800">{arc.belief}</p></div>
            </div>
            <div className="space-y-3">
              <div><p className="text-xs text-slate-500">Starting Behavior</p><p className="text-sm text-slate-800">{arc.behavior_start}</p></div>
              <div><p className="text-xs text-slate-500">Ending Behavior</p><p className="text-sm text-slate-800">{arc.behavior_end}</p></div>
              <div className="flex gap-4">
                <div className="bg-slate-50 rounded-lg p-3 flex-1">
                  <p className="text-xs text-slate-500">Transformation</p>
                  <p className="font-semibold">{(arc.transformation_score * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 flex-1">
                  <p className="text-xs text-slate-500">Completeness</p>
                  <p className="font-semibold">{(arc.arc_completeness * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Key Turning Points</h4>
          <div className="space-y-2">
            {arc.key_turning_points?.map((tp: any, j: number) => (
              <div key={j} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <div className="bg-indigo-100 text-indigo-700 font-bold text-sm px-2 py-1 rounded">Ch {tp.chapter}</div>
                <p className="text-sm text-slate-700">{tp.event}</p>
                <SeverityBadge severity={tp.impact} />
              </div>
            ))}
          </div>
        </Section>
      ))}

      {alternatives.length > 0 && (
        <Section title="Alternative Arcs">
          {alternatives.map((alt: any, i: number) => (
            <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-2">
              <p className="font-medium text-indigo-900">{alt.character}: {alt.alternative}</p>
              <p className="text-sm text-indigo-700 mt-1">{alt.description}</p>
              <p className="text-xs text-indigo-600 mt-2 italic">{alt.impact_assessment}</p>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

function ProseRefinery({ data }: { data: any }) {
  const filterWords = data.filter_words || [];
  const tics = data.tic_detection || [];
  const svt = data.show_vs_tell || {};
  const rhythm = data.sentence_rhythm || {};

  return (
    <>
      <Section title="Summary">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(data.summary || {}).map(([key, value]) => (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Filter Word Analysis">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filterWords.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="word" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="count" name="Count">
              {filterWords.slice(0, 10).map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Writing Tic Detection">
        {tics.map((tic: any, i: number) => (
          <div key={i} className="bg-slate-50 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">"{tic.pattern}"</span>
                <SeverityBadge severity={tic.severity} />
              </div>
              <span className="text-sm text-slate-500">{tic.count} occurrences</span>
            </div>
            <p className="text-sm text-slate-600">{tic.suggestion}</p>
          </div>
        ))}
      </Section>

      <Section title="Show vs. Tell">
        <div className="flex gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-3 flex-1 text-center">
            <p className="text-2xl font-bold text-green-700">{svt.total_show_instances}</p>
            <p className="text-xs text-green-600">Show instances</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 flex-1 text-center">
            <p className="text-2xl font-bold text-red-700">{svt.total_tell_instances}</p>
            <p className="text-xs text-red-600">Tell instances</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 flex-1 text-center">
            <p className="text-2xl font-bold text-indigo-700">{svt.ratio ? (svt.ratio * 100).toFixed(0) + '%' : 'N/A'}</p>
            <p className="text-xs text-indigo-600">Show ratio</p>
          </div>
        </div>
        {svt.issues?.map((issue: any, i: number) => (
          <div key={i} className="border-l-4 border-amber-400 bg-amber-50 p-3 mb-2 rounded-r-lg">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={issue.severity} />
              <span className="text-xs text-slate-500">Chapter {issue.chapter}</span>
            </div>
            <p className="text-sm text-red-700 italic">"{issue.text}"</p>
            <p className="text-sm text-green-700 mt-1">{issue.suggestion}</p>
          </div>
        ))}
      </Section>

      <Section title="Sentence Rhythm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Average Length</p>
            <p className="font-semibold">{rhythm.average_length} words</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Shortest</p>
            <p className="font-semibold">{rhythm.shortest} words</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Longest</p>
            <p className="font-semibold">{rhythm.longest} words</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Variation Score</p>
            <p className="font-semibold">{rhythm.variation_score ? (rhythm.variation_score * 100).toFixed(0) + '%' : 'N/A'}</p>
          </div>
        </div>
        {rhythm.distribution && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { range: '1-10 words', pct: rhythm.distribution.short_1_10 },
              { range: '11-20 words', pct: rhythm.distribution.medium_11_20 },
              { range: '21-30 words', pct: rhythm.distribution.long_21_30 },
              { range: '31+ words', pct: rhythm.distribution.very_long_31_plus },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pct" fill="#6366f1" name="Percentage" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>
    </>
  );
}

function RevisionCommand({ data }: { data: any }) {
  const health = data.health_dashboard || {};
  const moduleScores = data.module_scores || {};
  const editQueue = data.edit_queue || [];
  const summary = data.summary || {};

  const radarData = Object.entries(health)
    .filter(([k]) => k !== 'overall')
    .map(([key, value]) => ({
      subject: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      score: value as number,
    }));

  return (
    <>
      <Section title="Overview">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-700">{summary.overall_manuscript_score}</p>
            <p className="text-xs text-indigo-600">Overall Score</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{summary.high_priority}</p>
            <p className="text-xs text-red-600">High Priority</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{summary.medium_priority}</p>
            <p className="text-xs text-amber-600">Medium Priority</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{summary.low_priority}</p>
            <p className="text-xs text-blue-600">Low Priority</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">{summary.total_items}</p>
            <p className="text-xs text-slate-600">Total Items</p>
          </div>
        </div>
      </Section>

      <Section title="Health Radar">
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Module Scores">
        <div className="space-y-3">
          {Object.entries(moduleScores).map(([key, value]) => (
            <ScoreBar key={key} label={key} score={value as number} />
          ))}
        </div>
      </Section>

      <Section title={`Edit Queue (${editQueue.length} items)`}>
        <div className="space-y-2">
          {editQueue.map((item: any) => (
            <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={item.severity} />
                <span className="text-xs text-slate-400 capitalize">{item.module.replace(/_/g, ' ')}</span>
                {item.chapter && <span className="text-xs text-slate-400">{item.chapter}</span>}
              </div>
              <p className="text-sm font-medium text-slate-800">{item.finding}</p>
              <p className="text-sm text-slate-500 mt-1">{item.suggestion}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// --- Main Page ---

const moduleNames: Record<string, string> = {
  manuscript_intelligence: 'Manuscript Intelligence Engine',
  voice_isolation: 'Voice Isolation Lab',
  pacing_architect: 'Pacing Architect',
  character_arc: 'Character Arc Workshop',
  prose_refinery: 'Prose Refinery',
  revision_command: 'Revision Command Center',
};

const moduleRenderers: Record<string, React.FC<{ data: any }>> = {
  manuscript_intelligence: ManuscriptIntelligence,
  voice_isolation: VoiceIsolation,
  pacing_architect: PacingArchitect,
  character_arc: CharacterArc,
  prose_refinery: ProseRefinery,
  revision_command: RevisionCommand,
};

export default function AnalysisPage() {
  const { id, module } = useParams<{ id: string; module: string }>();

  const { data: manuscript } = useQuery({
    queryKey: ['manuscript', id],
    queryFn: async () => (await getManuscript(Number(id))).data.data,
  });

  const { data: analysisData, isLoading, error } = useQuery({
    queryKey: ['analysisModule', id, module],
    queryFn: async () => (await getAnalysisResult(Number(id), module!)).data.data,
    enabled: !!module,
  });

  const Renderer = module ? moduleRenderers[module] : null;
  const moduleName = module ? moduleNames[module] || module : '';

  return (
    <div>
      <Link
        to={`/manuscripts/${id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {manuscript?.title || 'Manuscript'}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">{moduleName}</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-lg p-6 text-center">
          Failed to load analysis results. Please run analysis first.
        </div>
      ) : analysisData && Renderer ? (
        <>
          {analysisData.scores && (
            <Section title="Scores">
              <div className="space-y-3">
                {Object.entries(analysisData.scores).map(([key, value]) => (
                  <ScoreBar key={key} label={key} score={value as number} />
                ))}
              </div>
            </Section>
          )}
          <Renderer data={analysisData} />
        </>
      ) : (
        <div className="text-center py-20 text-slate-400">No data available</div>
      )}
    </div>
  );
}
