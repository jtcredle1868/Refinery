import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscript } from '../../services/api';
import api from '../../services/api';
import {
  ArrowLeft, FileText, Loader, AlertCircle, BookOpen, TrendingUp,
  Shield, AlertTriangle, Target, Wrench, Award,
} from 'lucide-react';

function recommendationBadge(rec) {
  const styles = {
    ACQUIRE: 'bg-green-100 text-green-800 border-green-200',
    CONSIDER: 'bg-blue-100 text-blue-800 border-blue-200',
    REVISE_AND_RESUBMIT: 'bg-amber-100 text-amber-800 border-amber-200',
    PASS: 'bg-red-100 text-red-800 border-red-200',
  };
  return styles[rec] || 'bg-ink/10 text-ink/70 border-ink/10';
}

function recommendationLabel(rec) {
  const labels = {
    ACQUIRE: 'Acquire',
    CONSIDER: 'Consider',
    REVISE_AND_RESUBMIT: 'Revise & Resubmit',
    PASS: 'Pass',
  };
  return labels[rec] || rec;
}

function severityBadge(severity) {
  switch (severity) {
    case 'major':
      return 'bg-red-100 text-red-700';
    case 'minor':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-ink/10 text-ink/70';
  }
}

function scoreBadgeClasses(score) {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-blue-100 text-blue-800';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export default function ReaderReportView() {
  const { id: manuscriptId } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getManuscript(manuscriptId)
      .then((res) => setManuscript(res.data))
      .catch(() => setError('Failed to load manuscript'))
      .finally(() => setLoading(false));
  }, [manuscriptId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setReport(null);
    try {
      const res = await api.post('/reports/reader', {
        manuscript_id: parseInt(manuscriptId),
        author_name: authorName,
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate reader report');
    } finally {
      setGenerating(false);
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
      <div className="text-center py-20">
        <p className="text-ink/60">Manuscript not found.</p>
        <Link to="/" className="text-plum mt-2 inline-block hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={`/manuscript/${manuscriptId}`} className="flex items-center text-plum hover:underline mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">Reader Report</h1>
        <p className="text-ink/60 mt-1">
          Generate a comprehensive acquisition reader report for "{manuscript.title}"
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input form */}
      {!report && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Report Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1">Author Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter the author's name"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-refinery-blue focus:border-transparent"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-ink text-white py-3 rounded-lg font-medium hover:bg-ink/80 disabled:opacity-50 transition flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Generating Reader Report...</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5" />
                  <span>Generate Reader Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Report display */}
      {report && (
        <div className="space-y-6">
          {/* Title & Author header */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-display text-ink">
                  {report.title || manuscript.title}
                </h2>
                {report.author_name && (
                  <p className="text-ink/60 mt-1">by {report.author_name}</p>
                )}
              </div>
              {report.recommendation && (
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border ${recommendationBadge(report.recommendation)}`}>
                  <Award className="h-4 w-4 mr-1.5" />
                  {recommendationLabel(report.recommendation)}
                </span>
              )}
            </div>
          </div>

          {/* Synopsis */}
          {report.synopsis && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-5 w-5 text-plum" />
                <h3 className="font-semibold text-ink">Synopsis</h3>
              </div>
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{report.synopsis}</p>
            </div>
          )}

          {/* Acquisition Score */}
          {report.acquisition_score != null && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-5 w-5 text-plum" />
                <h3 className="font-semibold text-ink">Acquisition Score</h3>
              </div>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${scoreBadgeClasses(report.acquisition_score)}`}>
                {Math.round(report.acquisition_score)} / 100
              </span>
            </div>
          )}

          {/* Strengths */}
          {report.strengths && report.strengths.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-ink">
                  Strengths ({report.strengths.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.strengths.map((s, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                      {s.category}
                    </p>
                    <p className="text-sm text-ink/80">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {report.concerns && report.concerns.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-ink">
                  Concerns ({report.concerns.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.concerns.map((c, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                        {c.category}
                      </p>
                      {c.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(c.severity)}`}>
                          {c.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink/80">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Positioning */}
          {report.market_positioning && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-ink">Market Positioning</h3>
              </div>
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                {report.market_positioning}
              </p>
            </div>
          )}

          {/* Editorial Investment */}
          {report.editorial_investment && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Wrench className="h-5 w-5 text-ink/70" />
                <h3 className="font-semibold text-ink">Editorial Investment</h3>
              </div>
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                {report.editorial_investment}
              </p>
            </div>
          )}

          {/* Recommendation Rationale */}
          {report.recommendation_rationale && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Award className="h-5 w-5 text-plum" />
                <h3 className="font-semibold text-ink">Recommendation Rationale</h3>
              </div>
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                {report.recommendation_rationale}
              </p>
            </div>
          )}

          {/* Generate another */}
          <div className="flex justify-center">
            <button
              onClick={() => setReport(null)}
              className="border border-slate-300 text-ink/80 px-6 py-2.5 rounded-lg font-medium hover:bg-ink/5 transition"
            >
              Generate New Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
