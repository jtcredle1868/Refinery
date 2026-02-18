import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscript, getManuscriptAnalyses, runAnalysis } from '../../services/api';
import {
  Brain, PenTool, BarChart3, Clock, FileText, ChevronRight, Play, CheckCircle, AlertCircle, Loader,
} from 'lucide-react';

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

export default function ManuscriptView() {
  const { id } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        getManuscript(id),
        getManuscriptAnalyses(id),
      ]);
      setManuscript(mRes.data);
      setAnalyses(aRes.data);
    } catch (err) {
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

  // Get latest analysis of each type
  const latestXray = analyses.find((a) => a.analysis_type === 'xray' && a.status === 'completed');
  const latestProse = analyses.find((a) => a.analysis_type === 'prose_refinery' && a.status === 'completed');

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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-refinery-navy">{manuscript.title}</h1>
        <p className="text-refinery-slate mt-1">
          {manuscript.word_count.toLocaleString()} words &middot; {manuscript.chapter_count} chapters &middot; .{manuscript.file_type}
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Health Dashboard (if X-ray completed) */}
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

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Manuscript Intelligence Engine */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Brain className="h-8 w-8 text-refinery-blue" />
            <div>
              <h3 className="font-display font-semibold text-refinery-navy">Manuscript Intelligence Engine</h3>
              <p className="text-xs text-slate-400">Module 1 — Full Structural Scan</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Duplication detection, character census, timeline anomalies, lexical fingerprint, metaphor density heatmap.
          </p>
          <div className="flex items-center space-x-3">
            {latestXray ? (
              <Link
                to={`/manuscript/${id}/intelligence`}
                className="flex items-center space-x-1 bg-refinery-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
              >
                <BarChart3 className="h-4 w-4" />
                <span>View Results</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              onClick={() => handleRunAnalysis('xray')}
              disabled={running === 'xray'}
              className="flex items-center space-x-1 bg-refinery-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {running === 'xray' ? (
                <><Loader className="h-4 w-4 animate-spin" /><span>Running X-ray...</span></>
              ) : (
                <><Play className="h-4 w-4" /><span>{latestXray ? 'Re-run' : 'Run X-ray'}</span></>
              )}
            </button>
          </div>
        </div>

        {/* Module 5: Prose Refinery */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <PenTool className="h-8 w-8 text-refinery-gold" />
            <div>
              <h3 className="font-display font-semibold text-refinery-navy">Prose Refinery</h3>
              <p className="text-xs text-slate-400">Module 5 — Craft-Level Analysis</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Tic tracker, filter word detector, show-vs-tell analyzer, sentence rhythm profiler, metaphor frequency.
          </p>
          <div className="flex items-center space-x-3">
            {latestProse ? (
              <Link
                to={`/manuscript/${id}/prose`}
                className="flex items-center space-x-1 bg-refinery-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
              >
                <BarChart3 className="h-4 w-4" />
                <span>View Results</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              onClick={() => handleRunAnalysis('prose_refinery')}
              disabled={running === 'prose_refinery'}
              className="flex items-center space-x-1 bg-refinery-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {running === 'prose_refinery' ? (
                <><Loader className="h-4 w-4 animate-spin" /><span>Analyzing prose...</span></>
              ) : (
                <><Play className="h-4 w-4" /><span>{latestProse ? 'Re-run' : 'Analyze Prose'}</span></>
              )}
            </button>
          </div>
        </div>

        {/* Future modules (locked) */}
        {[
          { icon: '🎭', name: 'Voice Isolation Lab', desc: 'Module 2 — Coming in Beta', locked: true },
          { icon: '📈', name: 'Pacing Architect', desc: 'Module 3 — Coming in Beta', locked: true },
          { icon: '🧭', name: 'Character Arc Workshop', desc: 'Module 4 — Coming in Beta', locked: true },
          { icon: '📋', name: 'Revision Command Center', desc: 'Module 6 — Coming in Beta', locked: true },
        ].map((mod) => (
          <div key={mod.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 opacity-50">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{mod.icon}</span>
              <div>
                <h3 className="font-display font-semibold text-refinery-navy">{mod.name}</h3>
                <p className="text-xs text-slate-400">{mod.desc}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 italic">Available in the next release</p>
          </div>
        ))}
      </div>

      {/* Analysis history */}
      {analyses.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-display font-semibold text-refinery-navy mb-4">Analysis History</h2>
          <div className="space-y-2">
            {analyses.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                <div className="flex items-center space-x-3">
                  {a.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-refinery-green" />
                  ) : a.status === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-refinery-red" />
                  ) : (
                    <Loader className="h-5 w-5 text-refinery-blue animate-spin" />
                  )}
                  <span className="text-sm font-medium">{a.analysis_type.replace('_', ' ')}</span>
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
    </div>
  );
}
