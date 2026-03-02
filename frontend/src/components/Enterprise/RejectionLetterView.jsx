import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscript } from '../../services/api';
import api from '../../services/api';
import {
  ArrowLeft, Loader, AlertCircle, Mail, Copy, CheckCircle, RefreshCw,
} from 'lucide-react';

function toneBadge(tone) {
  switch (tone) {
    case 'standard':
      return 'bg-ink/10 text-ink/80';
    case 'encouraging':
      return 'bg-blue-100 text-blue-800';
    case 'detailed':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-ink/10 text-ink/70';
  }
}

export default function RejectionLetterView() {
  const { id: manuscriptId } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [tone, setTone] = useState('standard');
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getManuscript(manuscriptId)
      .then((res) => setManuscript(res.data))
      .catch(() => setError('Failed to load manuscript'))
      .finally(() => setLoading(false));
  }, [manuscriptId]);

  const handleGenerate = async (overrideTone) => {
    const selectedTone = overrideTone || tone;
    setGenerating(true);
    setError('');
    setLetter(null);
    setCopied(false);
    try {
      const res = await api.post('/reports/rejection', {
        manuscript_id: parseInt(manuscriptId),
        author_name: authorName,
        tone: selectedTone,
      });
      setLetter(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate rejection letter');
    } finally {
      setGenerating(false);
    }
  };

  const buildFullLetterText = () => {
    if (!letter) return '';
    const parts = [];
    if (letter.subject) parts.push(`Subject: ${letter.subject}`);
    parts.push('');
    if (letter.salutation) parts.push(letter.salutation);
    parts.push('');
    if (letter.body) parts.push(letter.body);
    parts.push('');
    if (letter.closing) parts.push(letter.closing);
    return parts.join('\n');
  };

  const handleCopy = async () => {
    const text = buildFullLetterText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = (newTone) => {
    setTone(newTone);
    handleGenerate(newTone);
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
    <div className="max-w-3xl mx-auto">
      <Link to={`/manuscript/${manuscriptId}`} className="flex items-center text-plum hover:underline mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">Rejection Letter</h1>
        <p className="text-ink/60 mt-1">
          Draft a professional rejection letter for "{manuscript.title}"
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input form */}
      {!letter && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-display text-ink mb-4">Letter Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1">Author Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter the author's name"
                className="w-full border border-ink/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-plum focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full border border-ink/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-plum focus:border-transparent"
              >
                <option value="standard">Standard</option>
                <option value="encouraging">Encouraging</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="w-full bg-ink text-parchment py-3 rounded-full font-medium uppercase tracking-wider hover:bg-ink/80 disabled:opacity-50 transition flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Generating Rejection Letter...</span>
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  <span>Generate Rejection Letter</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Letter display */}
      {letter && (
        <div className="space-y-6">
          {/* Letter card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Tone badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-plum" />
                <h3 className="font-semibold text-ink">Generated Letter</h3>
              </div>
              {letter.tone && (
                <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${toneBadge(letter.tone)}`}>
                  {letter.tone} tone
                </span>
              )}
            </div>

            {/* Subject */}
            {letter.subject && (
              <div className="mb-4 pb-4 border-b border-ink/10">
                <p className="text-xs text-ink/60 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-sm font-medium text-ink">{letter.subject}</p>
              </div>
            )}

            {/* Salutation */}
            {letter.salutation && (
              <p className="text-sm text-ink/80 mb-4">{letter.salutation}</p>
            )}

            {/* Body */}
            {letter.body && (
              <div className="text-sm text-ink/80 leading-relaxed mb-4 space-y-3">
                {letter.body.split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            )}

            {/* Closing */}
            {letter.closing && (
              <p className="text-sm text-ink/80 mt-6">{letter.closing}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition ${
                copied
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-ink text-parchment hover:bg-ink/80'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            {/* Regenerate with different tone */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-ink/60">Regenerate:</span>
              {['standard', 'encouraging', 'detailed']
                .filter((t) => t !== letter.tone)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => handleRegenerate(t)}
                    disabled={generating}
                    className="flex items-center space-x-1 border border-ink/20 text-ink/80 px-3 py-2 rounded-lg text-sm font-medium hover:bg-ink/5 disabled:opacity-50 transition capitalize"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{t}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Start over */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => { setLetter(null); setCopied(false); }}
              className="text-sm text-ink/40 hover:text-ink/70 transition"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
