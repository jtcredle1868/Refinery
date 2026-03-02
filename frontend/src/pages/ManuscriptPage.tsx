import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getManuscript, analyzeManuscript, getAllAnalysisResults,
  getEditQueue, updateEditQueueItem, exportManuscript, generateReaderReport,
} from '../services/api';
import {
  Brain, Mic2, Activity, Users, PenTool, ListChecks,
  Play, Download, FileText, Loader2, CheckCircle, X,
  AlertTriangle, ArrowLeft,
} from 'lucide-react';
import type { EditQueueItem, HealthDashboard } from '../types';

const modules = [
  { key: 'manuscript_intelligence', name: 'Manuscript Intelligence', icon: Brain, color: 'bg-blue-500' },
  { key: 'voice_isolation', name: 'Voice Isolation Lab', icon: Mic2, color: 'bg-purple-500' },
  { key: 'pacing_architect', name: 'Pacing Architect', icon: Activity, color: 'bg-green-500' },
  { key: 'character_arc', name: 'Character Arc Workshop', icon: Users, color: 'bg-orange-500' },
  { key: 'prose_refinery', name: 'Prose Refinery', icon: PenTool, color: 'bg-rose-500' },
  { key: 'revision_command', name: 'Revision Command Center', icon: ListChecks, color: 'bg-indigo-500' },
];

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  const bgColor = score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100';
  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bgColor}`}>
        <span className={`text-xl font-bold ${color}`}>{score}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1.5 capitalize">{label.replace(/_/g, ' ')}</p>
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config[severity] || 'bg-slate-100 text-slate-700'}`}>
      {severity}
    </span>
  );
}

export default function ManuscriptPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'queue'>('overview');

  const { data: manuscript, isLoading } = useQuery({
    queryKey: ['manuscript', id],
    queryFn: async () => (await getManuscript(Number(id))).data.data,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'ANALYZING' || status === 'EXTRACTING' ? 2000 : false;
    },
  });

  const { data: analysisResults } = useQuery({
    queryKey: ['analysis', id],
    queryFn: async () => (await getAllAnalysisResults(Number(id))).data.data,
    enabled: manuscript?.status === 'COMPLETE',
  });

  const { data: editQueue } = useQuery({
    queryKey: ['editQueue', id],
    queryFn: async () => (await getEditQueue(Number(id))).data.data,
    enabled: manuscript?.status === 'COMPLETE',
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeManuscript(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuscript', id] });
      queryClient.invalidateQueries({ queryKey: ['analysis', id] });
      queryClient.invalidateQueries({ queryKey: ['editQueue', id] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: string }) =>
      updateEditQueueItem(Number(id), itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['editQueue', id] }),
  });

  const handleExport = async (format: string, reportType = 'analysis') => {
    try {
      let res;
      if (reportType === 'reader_report') {
        res = await generateReaderReport(Number(id));
      } else {
        res = await exportManuscript(Number(id), format, reportType);
      }
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = reportType === 'reader_report' || format === 'pdf' ? 'pdf' : 'docx';
      a.download = `Refinery_${reportType === 'reader_report' ? 'ReaderReport' : 'Report'}_${manuscript?.title || 'export'}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!manuscript) {
    return <div className="text-center py-20 text-slate-500">Manuscript not found</div>;
  }

  const health: HealthDashboard | null = analysisResults?.revision_command?.health_dashboard || null;

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Manuscripts
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{manuscript.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span>{manuscript.original_filename}</span>
              <span>{manuscript.word_count.toLocaleString()} words</span>
              <span>{manuscript.chapter_count} chapters</span>
              <span className="capitalize">{manuscript.file_type}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {manuscript.status === 'COMPLETE' && (
              <>
                <button
                  onClick={() => handleExport('docx')}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Export DOCX
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" /> Export PDF
                </button>
                <button
                  onClick={() => handleExport('pdf', 'reader_report')}
                  className="flex items-center gap-1.5 px-4 py-2 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  <FileText className="h-4 w-4" /> Reader Report
                </button>
              </>
            )}
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={manuscript.status === 'ANALYZING' || manuscript.status === 'EXTRACTING' || !manuscript.word_count}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {manuscript.status === 'ANALYZING' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing ({Math.round(manuscript.progress_percent)}%)</>
              ) : (
                <><Play className="h-4 w-4" /> {manuscript.status === 'COMPLETE' ? 'Re-Analyze' : 'Analyze'}</>
              )}
            </button>
          </div>
        </div>

        {manuscript.status === 'ERROR' && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Analysis Error</p>
              <p className="text-sm text-red-600 mt-1">{manuscript.error_message}</p>
            </div>
          </div>
        )}

        {manuscript.status === 'ANALYZING' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-500 mb-1">
              <span>Analyzing manuscript...</span>
              <span>{Math.round(manuscript.progress_percent)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${manuscript.progress_percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Health Dashboard */}
      {health && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Health Dashboard</h2>
          <div className="flex items-center justify-around flex-wrap gap-4">
            <ScoreGauge score={health.structural_integrity} label="Structure" />
            <ScoreGauge score={health.voice_distinctiveness} label="Voice" />
            <ScoreGauge score={health.pacing_quality} label="Pacing" />
            <ScoreGauge score={health.prose_craft} label="Prose" />
            <ScoreGauge score={health.character_depth} label="Characters" />
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100">
                <span className="text-2xl font-bold text-indigo-600">{health.overall}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">Overall</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {manuscript.status === 'COMPLETE' && (
        <div className="flex gap-1 mb-6 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Analysis Modules
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'queue' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Edit Queue {editQueue?.length ? `(${editQueue.filter((i: EditQueueItem) => i.status === 'PENDING').length})` : ''}
          </button>
        </div>
      )}

      {/* Analysis Modules Grid */}
      {activeTab === 'overview' && manuscript.status === 'COMPLETE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const modData = analysisResults?.[mod.key];
            const ModIcon = mod.icon;
            const score = modData?.scores?.overall;
            return (
              <Link
                key={mod.key}
                to={`/manuscripts/${id}/analysis/${mod.key}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${mod.color} p-2 rounded-lg`}>
                    <ModIcon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{mod.name}</h3>
                </div>
                {modData ? (
                  <div className="space-y-2">
                    {score !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-600">{score}/100</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">Click to view detailed analysis</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Not yet analyzed</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Edit Queue */}
      {activeTab === 'queue' && editQueue && (
        <div className="space-y-3">
          {editQueue.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No items in edit queue</div>
          ) : (
            editQueue.map((item: EditQueueItem) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg border p-4 ${
                  item.status === 'ACCEPTED' ? 'border-green-200 bg-green-50/50' :
                  item.status === 'REJECTED' ? 'border-slate-200 bg-slate-50/50 opacity-60' :
                  'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={item.severity} />
                      <span className="text-xs text-slate-400 capitalize">{item.module.replace(/_/g, ' ')}</span>
                      {item.chapter && <span className="text-xs text-slate-400">{item.chapter}</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{item.finding}</p>
                    <p className="text-sm text-slate-500 mt-1">{item.suggestion}</p>
                  </div>
                  {item.status === 'PENDING' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, status: 'ACCEPTED' })}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-md"
                        title="Accept"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, status: 'REJECTED' })}
                        className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-500 rounded-md"
                        title="Reject"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {item.status !== 'PENDING' && (
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      item.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
