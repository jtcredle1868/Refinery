import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listManuscripts, getManuscriptAnalyses, generateCommitteeReport } from '../../services/api';
import { GraduationCap, FileText, ChevronRight, Loader, BookOpen, X } from 'lucide-react';

export default function AdvisorDashboardView() {
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportModal, setReportModal] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [templateType, setTemplateType] = useState('full_draft_review');
  const [advisorNotes, setAdvisorNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await listManuscripts();
        setManuscripts(res.data.manuscripts || []);
      } catch { setError('Failed to load manuscripts'); }
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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div></div>;

  return (
    <div>
      <div className="flex items-center space-x-3 mb-8">
        <GraduationCap className="h-10 w-10 text-violet-500" />
        <div>
          <h1 className="text-2xl font-display font-bold text-refinery-navy">Advisor Dashboard</h1>
          <p className="text-sm text-slate-500">{manuscripts.length} manuscript{manuscripts.length !== 1 ? 's' : ''} in portfolio</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

      {/* Manuscript Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {manuscripts.map(m => (
          <div key={m.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold text-refinery-navy">{m.title}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {m.word_count?.toLocaleString()} words &middot; {m.chapter_count} chapters
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                m.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>{m.status}</span>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Link
                to={`/manuscript/${m.id}`}
                className="flex items-center space-x-1 text-sm text-refinery-blue hover:text-blue-700"
              >
                <BookOpen className="h-4 w-4" /><span>View</span><ChevronRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => { setReportModal(m); setReport(null); }}
                className="flex items-center space-x-1 text-sm text-violet-600 hover:text-violet-800 ml-auto"
              >
                <FileText className="h-4 w-4" /><span>Committee Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {manuscripts.length === 0 && (
        <div className="text-center py-20">
          <GraduationCap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No manuscripts yet. Upload a dissertation to get started.</p>
          <Link to="/upload" className="mt-4 inline-block bg-refinery-blue text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Upload Manuscript
          </Link>
        </div>
      )}

      {/* Committee Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReportModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-semibold text-refinery-navy">Committee Report</h2>
                <p className="text-sm text-slate-500">{reportModal.title}</p>
              </div>
              <button onClick={() => setReportModal(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6">
              {!report ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Report Template</label>
                    <select value={templateType} onChange={e => setTemplateType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="proposal_defense">Proposal Defense</option>
                      <option value="chapter_review">Chapter Review</option>
                      <option value="full_draft_review">Full Draft Review</option>
                      <option value="final_defense_prep">Final Defense Prep</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Advisor Notes (optional)</label>
                    <textarea
                      value={advisorNotes} onChange={e => setAdvisorNotes(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm h-24" placeholder="Any notes for the committee report..."
                    />
                  </div>
                  <button
                    onClick={() => handleGenerateReport(reportModal.id)}
                    disabled={generating}
                    className="w-full flex items-center justify-center space-x-2 bg-violet-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {generating ? <><Loader className="h-4 w-4 animate-spin" /><span>Generating Report...</span></> : <><FileText className="h-4 w-4" /><span>Generate Report</span></>}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center border-b pb-4">
                    <h3 className="text-xl font-bold text-refinery-navy">{report.title}</h3>
                    <p className="text-sm text-slate-500">{report.report_type?.replace(/_/g, ' ')} — {report.date}</p>
                  </div>

                  {report.executive_summary && (
                    <div>
                      <h4 className="text-sm font-semibold text-refinery-navy mb-2">Executive Summary</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{report.executive_summary}</p>
                    </div>
                  )}

                  {report.sections?.map((section, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-semibold text-refinery-navy mb-2">{section.heading}</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{section.content}</p>
                    </div>
                  ))}

                  {report.strengths?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Strengths</h4>
                      <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
                        {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                  {report.areas_for_improvement?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-700 mb-2">Areas for Improvement</h4>
                      <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
                        {report.areas_for_improvement.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}

                  {report.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h4>
                      <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
                        {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {report.overall_assessment && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-refinery-navy mb-2">Overall Assessment</h4>
                      <p className="text-sm text-slate-700">{report.overall_assessment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
