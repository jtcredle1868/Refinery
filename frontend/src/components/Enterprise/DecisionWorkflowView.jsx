import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getWorkflow, advanceWorkflow, listAnnotations, createAnnotation } from '../../services/api';
import {
  CheckCircle, Circle, ArrowRight, Loader, AlertCircle, MessageSquare,
  Send, Clock,
} from 'lucide-react';

const STAGES = [
  { key: 'unreviewed', label: 'Unreviewed', minRole: 'reader' },
  { key: 'reader_reviewed', label: 'Reader Reviewed', minRole: 'editor' },
  { key: 'editor_recommended', label: 'Editor Recommended', minRole: 'director' },
  { key: 'director_decision', label: 'Director Decision', minRole: null },
];

const OUTCOMES = [
  { value: 'acquire', label: 'Acquire', color: 'bg-green-500' },
  { value: 'consider', label: 'Consider', color: 'bg-blue-500' },
  { value: 'revise_resubmit', label: 'Revise & Resubmit', color: 'bg-amber-500' },
  { value: 'pass', label: 'Pass', color: 'bg-red-500' },
];

export default function DecisionWorkflowView() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const loadData = async () => {
    try {
      const [wRes, aRes] = await Promise.all([
        getWorkflow(id),
        listAnnotations(id).catch(() => ({ data: [] })),
      ]);
      setWorkflow(wRes.data);
      setAnnotations(Array.isArray(aRes.data) ? aRes.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const currentStageIndex = workflow
    ? STAGES.findIndex((s) => s.key === workflow.stage)
    : 0;

  const handleAdvance = async () => {
    setAdvancing(true);
    setError('');
    try {
      const outcome = currentStageIndex === 2 ? selectedOutcome || null : null;
      await advanceWorkflow(parseInt(id), notes, outcome);
      setNotes('');
      setSelectedOutcome('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to advance workflow');
    } finally {
      setAdvancing(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await createAnnotation(parseInt(id), newComment.trim());
      setNewComment('');
      const aRes = await listAnnotations(id);
      setAnnotations(Array.isArray(aRes.data) ? aRes.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-plum"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display text-ink">Decision Workflow</h1>
        <p className="text-ink/60 mt-1">Acquisition decision pipeline for this manuscript</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
          <AlertCircle className="h-4 w-4" /><span>{error}</span>
        </div>
      )}

      {/* Stage stepper */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, i) => (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  i < currentStageIndex ? 'bg-green-500 text-white'
                    : i === currentStageIndex ? 'bg-ink text-parchment ring-4 ring-blue-100'
                      : 'bg-slate-200 text-ink/40'
                }`}>
                  {i < currentStageIndex ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <p className={`text-xs mt-2 text-center ${
                  i <= currentStageIndex ? 'text-ink font-medium' : 'text-ink/40'
                }`}>
                  {stage.label}
                </p>
              </div>
              {i < STAGES.length - 1 && (
                <ArrowRight className={`h-5 w-5 mx-2 flex-shrink-0 ${
                  i < currentStageIndex ? 'text-green-500' : 'text-ink/40'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Outcome badge */}
        {workflow?.outcome && workflow.outcome !== 'pending' && (
          <div className="mt-4 text-center">
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold text-white ${
              OUTCOMES.find((o) => o.value === workflow.outcome)?.color || 'bg-ink/50'
            }`}>
              {OUTCOMES.find((o) => o.value === workflow.outcome)?.label || workflow.outcome}
            </span>
          </div>
        )}
      </div>

      {/* Notes from each stage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {workflow?.reader_notes && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h4 className="text-xs font-medium text-ink/60 uppercase mb-2">Reader Notes</h4>
            <p className="text-sm text-ink/80">{workflow.reader_notes}</p>
          </div>
        )}
        {workflow?.editor_notes && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h4 className="text-xs font-medium text-ink/60 uppercase mb-2">Editor Notes</h4>
            <p className="text-sm text-ink/80">{workflow.editor_notes}</p>
          </div>
        )}
        {workflow?.director_notes && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h4 className="text-xs font-medium text-ink/60 uppercase mb-2">Director Notes</h4>
            <p className="text-sm text-ink/80">{workflow.director_notes}</p>
          </div>
        )}
      </div>

      {/* Advance workflow form */}
      {currentStageIndex < STAGES.length - 1 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="text-sm font-semibold text-ink mb-3">
            Advance to: {STAGES[currentStageIndex + 1]?.label}
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your notes for this stage..."
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm h-20 focus:outline-none focus:ring-2 focus:ring-refinery-blue mb-3"
          />

          {/* Outcome selector (only at editor_recommended -> director_decision) */}
          {currentStageIndex === 2 && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-ink/70 mb-2">Final Decision</label>
              <div className="flex space-x-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setSelectedOutcome(o.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      selectedOutcome === o.value
                        ? `${o.color} text-white border-transparent`
                        : 'bg-white text-ink/70 border-slate-300 hover:bg-ink/5'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAdvance}
            disabled={advancing || (currentStageIndex === 2 && !selectedOutcome)}
            className="flex items-center space-x-2 bg-ink text-parchment px-5 py-2.5 rounded-full text-sm font-medium uppercase tracking-wider hover:bg-ink/80 disabled:opacity-50 transition"
          >
            {advancing ? <Loader className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>{advancing ? 'Advancing...' : 'Advance Workflow'}</span>
          </button>
        </div>
      )}

      {/* Annotations / Editor Comments */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-sm font-semibold text-ink mb-4 flex items-center space-x-2">
          <MessageSquare className="h-4 w-4" /><span>Editor Comments ({annotations.length})</span>
        </h3>

        <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
          {annotations.length === 0 && (
            <p className="text-sm text-ink/40 text-center py-6">No comments yet. Be the first to add one.</p>
          )}
          {annotations.map((a) => (
            <div key={a.id} className="flex space-x-3 p-3 bg-ink/5 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ink text-parchment flex items-center justify-center text-xs font-bold">
                {(a.user_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-ink">{a.user_name}</span>
                  <span className="text-xs text-ink/40 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                  {a.chapter_num && (
                    <span className="text-xs bg-slate-200 text-ink/70 px-1.5 py-0.5 rounded">Ch. {a.chapter_num}</span>
                  )}
                </div>
                <p className="text-sm text-ink/80">{a.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* New comment input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            placeholder="Add a comment..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-refinery-blue"
          />
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
            className="bg-ink text-parchment px-4 py-2 rounded-full uppercase tracking-wider hover:bg-ink/80 disabled:opacity-50 transition"
          >
            {posting ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
