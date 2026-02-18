import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscriptAnalyses } from '../../services/api';
import { ArrowLeft, PenTool, Filter, Eye, Activity, Flower2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProseRefineryView() {
  const { id } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tics');

  useEffect(() => {
    getManuscriptAnalyses(id)
      .then((res) => {
        const prose = res.data.find((a) => a.analysis_type === 'prose_refinery' && a.status === 'completed');
        if (prose) {
          setResults(JSON.parse(prose.results_json));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-refinery-gold"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">No prose analysis results. Run the Prose Refinery first.</p>
        <Link to={`/manuscript/${id}`} className="text-refinery-blue mt-2 inline-block hover:underline">Back to manuscript</Link>
      </div>
    );
  }

  const tabs = [
    { key: 'tics', label: 'Tic Tracker', icon: PenTool },
    { key: 'filter', label: 'Filter Words', icon: Filter },
    { key: 'showvtell', label: 'Show vs Tell', icon: Eye },
    { key: 'rhythm', label: 'Sentence Rhythm', icon: Activity },
    { key: 'metaphor', label: 'Metaphors', icon: Flower2 },
  ];

  return (
    <div>
      <Link to={`/manuscript/${id}`} className="flex items-center text-refinery-blue hover:underline mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </Link>

      <div className="flex items-center space-x-3 mb-2">
        <PenTool className="h-8 w-8 text-refinery-gold" />
        <h1 className="text-3xl font-display font-bold text-refinery-navy">Prose Refinery</h1>
      </div>
      <p className="text-refinery-slate mb-4">Craft-level prose analysis results</p>

      {results.prose_score !== undefined && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-6 inline-block">
          <span className="text-sm text-slate-600">Prose Score: </span>
          <span className="text-2xl font-bold text-refinery-navy">{results.prose_score}</span>
          <span className="text-sm text-slate-500">/100</span>
        </div>
      )}

      {/* Summary */}
      {results.summary && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 mb-8">
          <h2 className="font-display font-semibold text-refinery-navy mb-2">Summary</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line">{results.summary}</p>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex space-x-1 bg-slate-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-refinery-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Tic Tracker */}
        {activeTab === 'tics' && results.tic_tracker && (
          <div>
            <h2 className="font-display font-semibold text-refinery-navy mb-4">
              Writing Tics ({results.tic_tracker.tics_found} found)
            </h2>
            <div className="space-y-3">
              {(results.tic_tracker.items || []).map((tic, i) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  tic.severity === 'high' ? 'border-red-200 bg-red-50' :
                  tic.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-refinery-navy">"{tic.word_or_phrase}"</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">{tic.total_count} occurrences</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tic.severity === 'high' ? 'bg-red-100 text-red-700' :
                        tic.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{tic.severity}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{tic.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Words */}
        {activeTab === 'filter' && results.filter_words && (
          <div>
            <h2 className="font-display font-semibold text-refinery-navy mb-2">Filter Word Analysis</h2>
            <p className="text-sm text-slate-500 mb-4">
              {results.filter_words.total_filter_words} total filter words
              ({results.filter_words.density_per_1000_words?.toFixed(1)} per 1,000 words)
            </p>

            {/* Top filter words */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Most frequent filter words</h3>
              <div className="flex flex-wrap gap-2">
                {(results.filter_words.top_filter_words || []).map((fw, i) => (
                  <span key={i} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                    {fw.word} ({fw.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Chapter breakdown chart */}
            {results.filter_words.chapter_breakdown && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Filter words by chapter</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={results.filter_words.chapter_breakdown}>
                    <XAxis dataKey="chapter" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="filter_word_count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Show vs Tell */}
        {activeTab === 'showvtell' && results.show_vs_tell && (
          <div>
            <h2 className="font-display font-semibold text-refinery-navy mb-4">
              Show vs. Tell ({results.show_vs_tell.tell_passages_found} telling passages found)
            </h2>
            <div className="space-y-4">
              {(results.show_vs_tell.items || []).map((item, i) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  item.severity === 'high' ? 'border-red-200' : 'border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">{item.location}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>{item.severity}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md mb-2">
                    <p className="text-sm text-slate-700 line-through italic">"{item.original}"</p>
                    <p className="text-xs text-red-600 mt-1">{item.issue}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-xs text-green-700 font-medium mb-1">Suggested alternative:</p>
                    <p className="text-sm text-slate-700">"{item.suggestion}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentence Rhythm */}
        {activeTab === 'rhythm' && results.sentence_rhythm && (
          <div>
            <h2 className="font-display font-semibold text-refinery-navy mb-4">Sentence Rhythm Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-refinery-navy">{results.sentence_rhythm.avg_sentence_length?.toFixed(1)}</p>
                <p className="text-xs text-slate-500">Avg words/sentence</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-refinery-navy">{results.sentence_rhythm.variance?.toFixed(1)}</p>
                <p className="text-xs text-slate-500">Variance</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-refinery-navy">
                  {(results.sentence_rhythm.consecutive_short_runs?.length || 0) +
                   (results.sentence_rhythm.consecutive_long_runs?.length || 0)}
                </p>
                <p className="text-xs text-slate-500">Rhythm flags</p>
              </div>
            </div>

            {/* Chapter rhythm chart */}
            {results.sentence_rhythm.chapter_rhythm_profile && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Rhythm score by chapter</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={results.sentence_rhythm.chapter_rhythm_profile}>
                    <XAxis dataKey="chapter" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="rhythm_score" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rhythm flags */}
            {(results.sentence_rhythm.consecutive_short_runs?.length > 0 ||
              results.sentence_rhythm.consecutive_long_runs?.length > 0) && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium text-slate-700">Flagged rhythm issues</h3>
                {(results.sentence_rhythm.consecutive_short_runs || []).map((r, i) => (
                  <div key={`s${i}`} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                    <span className="text-xs font-medium text-slate-600">{r.location}</span>
                    <span className="text-xs text-yellow-700 ml-2">{r.count} consecutive short sentences</span>
                    <p className="text-sm text-slate-600 mt-1 italic">"{r.excerpt}"</p>
                  </div>
                ))}
                {(results.sentence_rhythm.consecutive_long_runs || []).map((r, i) => (
                  <div key={`l${i}`} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <span className="text-xs font-medium text-slate-600">{r.location}</span>
                    <span className="text-xs text-orange-700 ml-2">{r.count} consecutive long sentences</span>
                    <p className="text-sm text-slate-600 mt-1 italic">"{r.excerpt}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metaphor Frequency */}
        {activeTab === 'metaphor' && results.metaphor_frequency && (
          <div>
            <h2 className="font-display font-semibold text-refinery-navy mb-4">Metaphor Frequency Analysis</h2>
            <div className="space-y-4">
              {(results.metaphor_frequency.metaphor_families || []).map((fam, i) => (
                <div key={i} className="p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-refinery-navy">{fam.family}</span>
                    <span className="text-sm text-slate-500">{fam.count} occurrences</span>
                  </div>
                  {(fam.overuse_windows || []).filter((w) => w.flagged).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 font-medium">Overuse detected:</p>
                      {fam.overuse_windows.filter((w) => w.flagged).map((w, j) => (
                        <p key={j} className="text-sm text-slate-600 ml-2">
                          {w.location}: {w.count_in_window} in this window
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
