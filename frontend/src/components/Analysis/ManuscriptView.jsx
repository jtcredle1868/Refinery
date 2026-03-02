import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';
import {
  Brain, PenTool, BarChart3, Clock, FileText, ChevronRight, Play, CheckCircle,
  AlertCircle, Loader, Mic, Activity, Users, ListChecks, GraduationCap, BookOpen,
  Quote, Target, Download,
} from 'lucide-react';
import ExportModal from '../Export/ExportModal';

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

const MODULES = [
  {
    key: 'xray', type: 'intelligence_engine', name: 'Manuscript Intelligence Engine',
    desc: 'Duplication detection, character census, timeline anomalies, lexical fingerprint.',
    icon: Brain, color: 'text-refinery-blue', btnColor: 'bg-refinery-blue hover:bg-blue-700',
    route: 'intelligence', scoreKey: 'score_overall',
  },
  {
    key: 'voice_isolation', type: 'voice_isolation', name: 'Voice Isolation Lab',
    desc: 'Character dialogue extraction, voice fingerprinting, jargon bleed detection.',
    icon: Mic, color: 'text-purple-500', btnColor: 'bg-purple-500 hover:bg-purple-700',
    route: 'voice', scoreKey: 'score_voice', tier: 'pro',
  },
  {
    key: 'pacing_architect', type: 'pacing_architect', name: 'Pacing Architect',
    desc: 'Tension curve, action/emotion pulse graph, breathing space detection.',
    icon: Activity, color: 'text-emerald-500', btnColor: 'bg-emerald-500 hover:bg-emerald-700',
    route: 'pacing', scoreKey: 'score_pacing', tier: 'pro',
  },
  {
    key: 'character_arc', type: 'character_arc', name: 'Character Arc Workshop',
    desc: 'Want/Fear/Belief tracking, inconsistency flagging, transformation validation.',
    icon: Users, color: 'text-rose-500', btnColor: 'bg-rose-500 hover:bg-rose-700',
    route: 'characters', scoreKey: 'score_character', tier: 'pro',
  },
  {
    key: 'prose_refinery', type: 'prose_refinery', name: 'Prose Refinery',
    desc: 'Tic tracker, filter word detector, show-vs-tell, sentence rhythm, metaphor frequency.',
    icon: PenTool, color: 'text-refinery-gold', btnColor: 'bg-refinery-gold hover:bg-amber-600',
    route: 'prose', scoreKey: 'score_prose',
  },
  {
    key: 'revision_center', type: 'revision_center', name: 'Revision Command Center',
    desc: 'Aggregated edit queue from all modules, sorted by impact.',
    icon: ListChecks, color: 'text-indigo-500', btnColor: 'bg-indigo-500 hover:bg-indigo-700',
    route: 'revision', scoreKey: null, tier: 'pro',
  },
];

const ACADEMIC_MODULES = [
  {
    key: 'argument_coherence', type: 'argument_coherence', name: 'Argument Coherence Engine',
    desc: 'Thesis extraction, evidence-to-claim ratio, logical progression, counterargument coverage.',
    icon: Target, color: 'text-teal-500', btnColor: 'bg-teal-500 hover:bg-teal-700',
    route: 'argument', scoreKey: 'score_structure', tier: 'academic',
  },
  {
    key: 'citation_architecture', type: 'citation_architecture', name: 'Citation & Source Architecture',
    desc: 'Citation frequency heatmap, source recency, primary/secondary balance, format validation.',
    icon: Quote, color: 'text-cyan-500', btnColor: 'bg-cyan-500 hover:bg-cyan-700',
    route: 'citations', scoreKey: 'score_overall', tier: 'academic',
  },
  {
    key: 'academic_voice', type: 'academic_voice', name: 'Academic Voice Calibration',
    desc: 'Register consistency, hedge analysis, passive voice density, formality scoring.',
    icon: GraduationCap, color: 'text-violet-500', btnColor: 'bg-violet-500 hover:bg-violet-700',
    route: 'academic-voice', scoreKey: 'score_voice', tier: 'academic',
  },
];

export default function ManuscriptView() {
  const { id } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [error, setError] = useState('');
  const [showExport, setShowExport] = useState(false);

  const load = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        getManuscript(id),
        getManuscriptAnalyses(id),
      ]);
      setManuscript(mRes.data);
      setAnalyses(aRes.data);
    } catch {
      setError('Failed to load manuscript');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRunAnalysis = async (type) => {
    setRunning(type);
    setError('');
    try {
      await runAnalysis(parseInt(id), type);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || `Analysis failed: ${type}`);
    } finally {
      setRunning(null);
    }
  };

  const getLatest = (type) => analyses.find((a) => a.analysis_type === type && a.status === 'completed');
  const latestXray = getLatest('xray') || getLatest('intelligence_engine');

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

  const renderModuleCard = (mod) => {
    const latest = getLatest(mod.key === 'xray' ? 'xray' : mod.type);
    const Icon = mod.icon;
    return (
      <div key={mod.key} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-3">
          <Icon className={`h-8 w-8 ${mod.color}`} />
          <div>
            <h3 className="font-display font-semibold text-refinery-navy">{mod.name}</h3>
            <p className="text-xs text-slate-400">
              {mod.tier ? <span className="uppercase bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1">{mod.tier}+</span> : null}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">{mod.desc}</p>
        <div className="flex items-center space-x-3">
          {latest ? (
            <Link
              to={`/manuscript/${id}/${mod.route}`}
              className="flex items-center space-x-1 bg-refinery-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
            >
              <BarChart3 className="h-4 w-4" />
              <span>View Results</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
          <button
            onClick={() => handleRunAnalysis(mod.key === 'xray' ? 'xray' : mod.type)}
            disabled={running === mod.type || running === mod.key}
            className={`flex items-center space-x-1 ${mod.btnColor} text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition`}
          >
            {running === mod.type || running === mod.key ? (
              <><Loader className="h-4 w-4 animate-spin" /><span>Running...</span></>
            ) : (
              <><Play className="h-4 w-4" /><span>{latest ? 'Re-run' : 'Run'}</span></>
            )}
          </button>
        </div>
        {latest?.scoreKey && latest[mod.scoreKey] && (
          <div className="mt-3 text-xs text-slate-400">
            Score: <span className="font-medium text-refinery-navy">{Math.round(latest[mod.scoreKey])}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-refinery-navy">{manuscript.title}</h1>
          <p className="text-refinery-slate mt-1">
            {manuscript.word_count.toLocaleString()} words &middot; {manuscript.chapter_count} chapters &middot; .{manuscript.file_type}
          </p>
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center space-x-2 bg-refinery-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Health Dashboard */}
      {latestXray && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-display font-semibold text-refinery-navy mb-6">Manuscript Health Dashboard</h2>
          <div className="flex flex-wrap justify-around gap-4">
            <ScoreRing score={Math.round(latestXray.score_structure || 0)} label="Structure" />
            <ScoreRing score={Math.round(latestXray.score_voice || 0)} label="Voice" />
            <ScoreRing score={Math.round(latestXray.score_pacing || 0)} label="Pacing" />
            <ScoreRing score={Math.round(latestXray.score_character || 0)} label="Character" />
            <ScoreRing score={Math.round(latestXray.score_prose || 0)} label="Prose" />
            <ScoreRing score={Math.round(latestXray.score_overall || 0)} label="Overall" size={100} />
          </div>
          {latestXray.duration_seconds && (
            <p className="text-xs text-slate-400 text-center mt-4">
              <Clock className="inline h-3 w-3 mr-1" />
              Analyzed in {latestXray.duration_seconds.toFixed(1)}s
            </p>
          )}
        </div>
      )}

      {/* Core Module Cards */}
      <h2 className="text-lg font-display font-semibold text-refinery-navy mb-4">Core Analysis Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {MODULES.map(renderModuleCard)}
      </div>

      {/* Academic Module Cards */}
      <h2 className="text-lg font-display font-semibold text-refinery-navy mb-4">Academic Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {ACADEMIC_MODULES.map(renderModuleCard)}
      </div>

      {/* Enterprise Actions */}
      <h2 className="text-lg font-display font-semibold text-refinery-navy mb-4">Enterprise</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to={`/manuscript/${id}/reader-report`}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-blue-300 transition"
        >
          <FileText className="h-8 w-8 text-blue-500 mb-3" />
          <h3 className="font-display font-semibold text-refinery-navy">Reader Report</h3>
          <p className="text-sm text-slate-500 mt-1">Generate acquisition reader report</p>
        </Link>
        <Link
          to={`/manuscript/${id}/rejection`}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-blue-300 transition"
        >
          <BookOpen className="h-8 w-8 text-amber-500 mb-3" />
          <h3 className="font-display font-semibold text-refinery-navy">Rejection Letter</h3>
          <p className="text-sm text-slate-500 mt-1">Draft personalized rejection letter</p>
        </Link>
        <button
          onClick={() => handleRunAnalysis('acquisition_score')}
          disabled={running === 'acquisition_score'}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-blue-300 transition text-left"
        >
          <BarChart3 className="h-8 w-8 text-emerald-500 mb-3" />
          <h3 className="font-display font-semibold text-refinery-navy">Acquisition Score</h3>
          <p className="text-sm text-slate-500 mt-1">
            {running === 'acquisition_score' ? 'Computing...' : 'Compute composite 0-100 score'}
          </p>
          {getLatest('acquisition_score') && (
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {Math.round(JSON.parse(getLatest('acquisition_score').results_json || '{}').acquisition_score || 0)}
            </p>
          )}
        </button>
      </div>

      {/* Analysis history */}
      {analyses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-display font-semibold text-refinery-navy mb-4">Analysis History</h2>
          <div className="space-y-2">
            {analyses.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                <div className="flex items-center space-x-3">
                  {a.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : a.status === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Loader className="h-5 w-5 text-refinery-blue animate-spin" />
                  )}
                  <span className="text-sm font-medium capitalize">{a.analysis_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  {a.duration_seconds && <span>{a.duration_seconds.toFixed(1)}s</span>}
                  {a.score_overall && <span className="font-medium text-refinery-navy">Score: {Math.round(a.score_overall)}</span>}
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          manuscriptId={parseInt(id)}
          manuscriptTitle={manuscript.title}
        />
      )}
    </div>
  );
}
