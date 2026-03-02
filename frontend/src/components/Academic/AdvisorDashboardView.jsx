import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listManuscripts, listStudents, createInviteCode,
  generateCommitteeReport,
  createAdvisorAnnotation, listAdvisorAnnotations, getProgressTracking,
} from '../../services/api';
import {
  GraduationCap, FileText, ChevronRight, Loader, BookOpen, X,
  UserPlus, Copy, CheckCircle, MessageSquare, Send, TrendingUp,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdvisorDashboardView() {
  const [manuscripts, setManuscripts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('portfolio');

  // Report modal
  const [reportModal, setReportModal] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [templateType, setTemplateType] = useState('full_draft_review');
  const [advisorNotes, setAdvisorNotes] = useState('');

  // Invite code
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Annotations
  const [annotationModal, setAnnotationModal] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Progress tracking
  const [progressModal, setProgressModal] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [msRes, stRes] = await Promise.all([
          listManuscripts(),
          listStudents().catch(() => ({ data: { students: [] } })),
        ]);
        setManuscripts(msRes.data.manuscripts || []);
        setStudents(stRes.data.students || []);
      } catch { setError('Failed to load data'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleGenerateReport = async (manuscriptId) => {
    setGenerating(true); setError(''); setReport(null);
    try {
      const res = await generateCommitteeReport(manuscriptId, templateType, advisorNotes);
      setReport(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Report generation failed'); }
    finally { setGenerating(false); }
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await createInviteCode();
      setInviteCode(res.data.code);
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create invite'); }
    finally { setInviteLoading(false); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const openAnnotations = async (manuscriptId) => {
    setAnnotationModal(manuscriptId);
    try {
      const res = await listAdvisorAnnotations(manuscriptId);
      setAnnotations(Array.isArray(res.data) ? res.data : []);
    } catch { setAnnotations([]); }
  };

  const handlePostAnnotation = async () => {
    if (!newComment.trim() || !annotationModal) return;
    setPosting(true);
    try {
      await createAdvisorAnnotation(annotationModal, newComment.trim());
      setNewComment('');
      const res = await listAdvisorAnnotations(annotationModal);
      setAnnotations(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setError(err.response?.data?.detail || 'Failed to post'); }
    finally { setPosting(false); }
  };

  const openProgress = async (manuscriptId) => {
    setProgressModal(manuscriptId);
    setProgressLoading(true);
    try {
      const res = await getProgressTracking(manuscriptId);
      setProgressData(res.data);
    } catch { setProgressData(null); }
    finally { setProgressLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-10 w-10 text-violet-500" />
          <div>
            <h1 className="text-2xl font-display text-ink">Advisor Dashboard</h1>
            <p className="text-sm text-ink/60">
              {manuscripts.length} manuscript{manuscripts.length !== 1 ? 's' : ''} &middot; {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {inviteCode ? (
            <div className="flex items-center space-x-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <code className="text-sm font-mono text-violet-700">{inviteCode}</code>
              <button onClick={handleCopyCode} className="text-violet-500 hover:text-violet-700">
                {codeCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <button onClick={handleCreateInvite} disabled={inviteLoading}
              className="flex items-center space-x-2 bg-violet-500 text-parchment px-4 py-2 rounded-full text-sm font-medium uppercase tracking-wider hover:bg-violet-700 disabled:opacity-50 transition">
              {inviteLoading ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span>Add Student</span>
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">{error}</div>}

      {/* Tab bar */}
      <div className="flex space-x-1 bg-ink/10 rounded-lg p-1 mb-6 w-fit">
        <button onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'portfolio' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink/80'}`}>
          My Portfolio
        </button>
        <button onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'students' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink/80'}`}>
          Students ({students.length})
        </button>
      </div>

      {activeTab === 'portfolio' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {manuscripts.map(m => (
              <div key={m.id} className="rounded-3xl border border-ink/10 bg-white/90 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-ink">{m.title}</h3>
                    <p className="text-xs text-ink/40 mt-1">{m.word_count?.toLocaleString()} words &middot; {m.chapter_count} chapters</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-ink/10 text-ink/70'}`}>{m.status}</span>
                </div>
                <div className="flex items-center space-x-2 mt-4 flex-wrap gap-y-2">
                  <Link to={`/manuscript/${m.id}`} className="flex items-center space-x-1 text-sm text-plum hover:text-blue-700">
                    <BookOpen className="h-4 w-4" /><span>View</span><ChevronRight className="h-3 w-3" />
                  </Link>
                  <button onClick={() => openAnnotations(m.id)} className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 ml-2">
                    <MessageSquare className="h-4 w-4" /><span>Annotate</span>
                  </button>
                  <button onClick={() => openProgress(m.id)} className="flex items-center space-x-1 text-sm text-amber-600 hover:text-amber-800 ml-2">
                    <TrendingUp className="h-4 w-4" /><span>Progress</span>
                  </button>
                  <button onClick={() => { setReportModal(m); setReport(null); }} className="flex items-center space-x-1 text-sm text-violet-600 hover:text-violet-800 ml-auto">
                    <FileText className="h-4 w-4" /><span>Report</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {manuscripts.length === 0 && (
            <div className="text-center py-20">
              <GraduationCap className="h-16 w-16 text-ink/40 mx-auto mb-4" />
              <p className="text-ink/60">No manuscripts yet.</p>
              <Link to="/upload" className="mt-4 inline-block bg-ink text-parchment px-6 py-2 rounded-full uppercase tracking-wider text-sm font-medium hover:bg-ink/80">Upload Manuscript</Link>
            </div>
          )}
        </>
      )}

      {activeTab === 'students' && (
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border">
              <UserPlus className="h-16 w-16 text-ink/40 mx-auto mb-4" />
              <p className="text-ink/60 mb-2">No students linked yet.</p>
              <p className="text-sm text-ink/40">Click "Add Student" above to generate an invite code.</p>
            </div>
          ) : students.map((s) => (
            <div key={s.user_id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{s.full_name || s.email}</h3>
                  <p className="text-xs text-ink/40">{s.email} &middot; {s.manuscript_count} manuscript{s.manuscript_count !== 1 ? 's' : ''}</p>
                </div>
                {s.latest_manuscript && (
                  <div className="text-right">
                    <Link to={`/manuscript/${s.latest_manuscript.id}`} className="text-sm text-plum hover:text-blue-700 flex items-center space-x-1">
                      <BookOpen className="h-4 w-4" /><span>{s.latest_manuscript.title}</span><ChevronRight className="h-3 w-3" />
                    </Link>
                    <p className="text-xs text-ink/40 mt-1">{s.latest_manuscript.word_count?.toLocaleString()} words</p>
                  </div>
                )}
              </div>
              {s.latest_manuscript && (
                <div className="flex items-center space-x-3 mt-3 pt-3 border-t">
                  <button onClick={() => openAnnotations(s.latest_manuscript.id)} className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800">
                    <MessageSquare className="h-3 w-3" /><span>Annotate</span>
                  </button>
                  <button onClick={() => openProgress(s.latest_manuscript.id)} className="flex items-center space-x-1 text-xs text-amber-600 hover:text-amber-800">
                    <TrendingUp className="h-3 w-3" /><span>Progress</span>
                  </button>
                  <button onClick={() => { setReportModal({ id: s.latest_manuscript.id, title: s.latest_manuscript.title }); setReport(null); }}
                    className="flex items-center space-x-1 text-xs text-violet-600 hover:text-violet-800">
                    <FileText className="h-3 w-3" /><span>Committee Report</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Committee Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReportModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display text-ink">Committee Report</h2>
                <p className="text-sm text-ink/60">{reportModal.title}</p>
              </div>
              <button onClick={() => setReportModal(null)} className="text-ink/40 hover:text-ink/70"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {!report ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-1">Report Template</label>
                    <select value={templateType} onChange={e => setTemplateType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="proposal_defense">Proposal Defense</option>
                      <option value="chapter_review">Chapter Review</option>
                      <option value="full_draft_review">Full Draft Review</option>
                      <option value="final_defense_prep">Final Defense Prep</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-1">Advisor Notes (optional)</label>
                    <textarea value={advisorNotes} onChange={e => setAdvisorNotes(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm h-24" placeholder="Any notes for the committee report..." />
                  </div>
                  <button onClick={() => handleGenerateReport(reportModal.id)} disabled={generating}
                    className="w-full flex items-center justify-center space-x-2 bg-violet-500 text-parchment px-4 py-3 rounded-full font-medium uppercase tracking-wider hover:bg-violet-700 disabled:opacity-50">
                    {generating ? <><Loader className="h-4 w-4 animate-spin" /><span>Generating...</span></> : <><FileText className="h-4 w-4" /><span>Generate Report</span></>}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center border-b pb-4">
                    <h3 className="text-xl font-bold text-ink">{report.title}</h3>
                    <p className="text-sm text-ink/60">{report.report_type?.replace(/_/g, ' ')} — {report.date}</p>
                  </div>
                  {report.executive_summary && <div><h4 className="text-sm font-semibold text-ink mb-2">Executive Summary</h4><p className="text-sm text-ink/80 whitespace-pre-line">{report.executive_summary}</p></div>}
                  {report.sections?.map((section, i) => <div key={i}><h4 className="text-sm font-semibold text-ink mb-2">{section.heading}</h4><p className="text-sm text-ink/80 whitespace-pre-line">{section.content}</p></div>)}
                  {report.strengths?.length > 0 && <div><h4 className="text-sm font-semibold text-green-700 mb-2">Strengths</h4><ul className="list-disc ml-5 text-sm text-ink/80 space-y-1">{report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                  {report.areas_for_improvement?.length > 0 && <div><h4 className="text-sm font-semibold text-amber-700 mb-2">Areas for Improvement</h4><ul className="list-disc ml-5 text-sm text-ink/80 space-y-1">{report.areas_for_improvement.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}
                  {report.recommendations?.length > 0 && <div><h4 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h4><ul className="list-disc ml-5 text-sm text-ink/80 space-y-1">{report.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
                  {report.overall_assessment && <div className="bg-ink/5 rounded-lg p-4"><h4 className="text-sm font-semibold text-ink mb-2">Overall Assessment</h4><p className="text-sm text-ink/80">{report.overall_assessment}</p></div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Annotation Modal */}
      {annotationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAnnotationModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-ink flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-500" /><span>Annotations</span>
              </h3>
              <button onClick={() => setAnnotationModal(null)} className="text-ink/40 hover:text-ink/70"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {annotations.length === 0 && <p className="text-sm text-ink/40 text-center py-8">No annotations yet.</p>}
              {annotations.map((a) => (
                <div key={a.id} className="flex space-x-3 p-3 bg-ink/5 rounded-lg">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500 text-parchment flex items-center justify-center text-xs font-bold">
                    {(a.user_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-ink">{a.user_name}</span>
                      <span className="text-xs text-ink/40">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-ink/80">{a.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex space-x-2">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePostAnnotation()}
                placeholder="Add annotation..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={handlePostAnnotation} disabled={!newComment.trim() || posting}
                className="bg-violet-500 text-parchment px-3 py-2 rounded-full text-sm uppercase tracking-wider hover:bg-violet-700 disabled:opacity-50 transition">
                {posting ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Tracking Modal */}
      {progressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setProgressModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-ink flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-amber-500" /><span>Progress Tracking</span>
              </h3>
              <button onClick={() => setProgressModal(null)} className="text-ink/40 hover:text-ink/70"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {progressLoading ? (
                <div className="flex justify-center py-12"><Loader className="h-8 w-8 animate-spin text-amber-500" /></div>
              ) : progressData?.timeline?.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-ink/70 mb-4">Health Score Over Time</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressData.timeline.map((t) => ({ ...t, date: new Date(t.date).toLocaleDateString() }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="overall" stroke="#5f2d82" strokeWidth={2} name="Overall" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="structure" stroke="#10b981" strokeWidth={1.5} name="Structure" />
                      <Line type="monotone" dataKey="voice" stroke="#8b5cf6" strokeWidth={1.5} name="Voice" />
                      <Line type="monotone" dataKey="pacing" stroke="#f59e0b" strokeWidth={1.5} name="Pacing" />
                      <Line type="monotone" dataKey="prose" stroke="#ef4444" strokeWidth={1.5} name="Prose" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-ink/40 mx-auto mb-3" />
                  <p className="text-sm text-ink/40">No progress data yet. Run analyses to build the timeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
