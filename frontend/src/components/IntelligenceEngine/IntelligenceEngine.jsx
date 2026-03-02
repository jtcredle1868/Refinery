import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManuscriptAnalyses } from '../../services/api';
import { ArrowLeft, Users, Clock, BookOpen, AlertTriangle, Fingerprint, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function IntelligenceEngine() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getManuscriptAnalyses(id)
      .then((res) => {
        const xray = res.data.find((a) => a.analysis_type === 'xray' && a.status === 'completed');
        if (xray) {
          setAnalysis(xray);
          setResults(JSON.parse(xray.results_json));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-refinery-blue"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">No analysis results found. Run the X-ray diagnostic first.</p>
        <Link to={`/manuscript/${id}`} className="text-refinery-blue mt-2 inline-block hover:underline">Back to manuscript</Link>
      </div>
    );
  }

  const { character_census, timeline_anomalies, duplication_detection, lexical_fingerprint, metaphor_density } = results;

  // Chapter word count chart data
  const chapterData = results.local_stats?.chapter_word_counts || [];

  return (
    <div>
      <Link to={`/manuscript/${id}`} className="flex items-center text-refinery-blue hover:underline mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to manuscript
      </Link>

      <h1 className="text-3xl font-display font-bold text-refinery-navy mb-2">Manuscript Intelligence Engine</h1>
      <p className="text-refinery-slate mb-8">Full structural scan results</p>

      {/* Summary */}
      {results.summary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="font-display font-semibold text-refinery-navy mb-2">Executive Summary</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line">{results.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Character Census */}
        {character_census && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="h-5 w-5 text-refinery-blue" />
              <h2 className="font-display font-semibold text-refinery-navy">
                Character Census ({character_census.total_characters} characters)
              </h2>
            </div>
            <div className="overflow-auto max-h-80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Mentions</th>
                    <th className="pb-2">First</th>
                    <th className="pb-2">Last</th>
                    <th className="pb-2">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(character_census.characters || []).map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2 text-slate-600">{c.frequency}</td>
                      <td className="py-2 text-slate-500 text-xs">{c.first_appearance}</td>
                      <td className="py-2 text-slate-500 text-xs">{c.last_appearance}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.role === 'protagonist' ? 'bg-blue-100 text-blue-800' :
                          c.role === 'antagonist' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>{c.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Timeline Anomalies */}
        {timeline_anomalies && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-5 w-5 text-refinery-gold" />
              <h2 className="font-display font-semibold text-refinery-navy">
                Timeline Anomalies ({timeline_anomalies.anomalies_found} found)
              </h2>
            </div>
            {(timeline_anomalies.items || []).length === 0 ? (
              <p className="text-sm text-slate-500">No chronological inconsistencies detected.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-auto">
                {timeline_anomalies.items.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    a.severity === 'high' ? 'border-red-200 bg-red-50' :
                    a.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className={`h-4 w-4 ${
                        a.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <span className="text-xs font-medium text-slate-600">{a.location}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        a.severity === 'high' ? 'bg-red-100 text-red-700' :
                        a.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{a.severity}</span>
                    </div>
                    <p className="text-sm text-slate-700">{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Duplication Detection */}
        {duplication_detection && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-5 w-5 text-refinery-red" />
              <h2 className="font-display font-semibold text-refinery-navy">
                Duplication Detection ({duplication_detection.duplicates_found} found)
              </h2>
            </div>
            {(duplication_detection.items || []).length === 0 ? (
              <p className="text-sm text-slate-500">No significant duplication detected.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-auto">
                {duplication_detection.items.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{d.location_a} ↔ {d.location_b}</span>
                      <span className="font-bold text-red-700">{d.similarity_percent}% similar</span>
                    </div>
                    <p className="text-sm text-slate-700 italic">"{d.excerpt}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lexical Fingerprint */}
        {lexical_fingerprint && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Fingerprint className="h-5 w-5 text-indigo-600" />
              <h2 className="font-display font-semibold text-refinery-navy">Lexical Fingerprint</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">Top 50 distinctive words that define this manuscript</p>
            <div className="flex flex-wrap gap-2">
              {(lexical_fingerprint.top_50_with_frequency || []).slice(0, 50).map((w, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `hsl(220, 80%, ${90 - (w.distinctiveness || 50) * 0.4}%)`,
                    color: (w.distinctiveness || 50) > 60 ? 'white' : '#1e293b',
                  }}
                >
                  {w.word} ({w.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metaphor Density Heatmap */}
        {metaphor_density && metaphor_density.chapter_heatmap && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Flame className="h-5 w-5 text-orange-600" />
              <h2 className="font-display font-semibold text-refinery-navy">Metaphor Density Heatmap</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Dominant families: {(metaphor_density.dominant_families || []).join(', ')}
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metaphor_density.chapter_heatmap}>
                <XAxis dataKey="chapter" label={{ value: 'Chapter', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Density', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="density">
                  {metaphor_density.chapter_heatmap.map((entry, i) => (
                    <Cell key={i} fill={entry.flagged ? '#ef4444' : '#60a5fa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chapter Word Counts */}
        {chapterData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
            <h2 className="font-display font-semibold text-refinery-navy mb-4">Chapter Word Counts</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chapterData}>
                <XAxis dataKey="chapter" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="word_count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
