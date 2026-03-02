import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getManuscripts, uploadManuscript, deleteManuscript } from '../services/api';
import { Upload, FileText, Trash2, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { Manuscript } from '../types';

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-amber-500', label: 'Ready' },
  EXTRACTING: { icon: Loader2, color: 'text-blue-500', label: 'Extracting...' },
  ANALYZING: { icon: Loader2, color: 'text-indigo-500', label: 'Analyzing...' },
  COMPLETE: { icon: CheckCircle, color: 'text-green-600', label: 'Complete' },
  ERROR: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: manuscripts, isLoading } = useQuery({
    queryKey: ['manuscripts'],
    queryFn: async () => {
      const res = await getManuscripts();
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteManuscript(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manuscripts'] }),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'pdf', 'txt', 'rtf'].includes(ext || '')) {
      setUploadError('Unsupported file type. Accepted: .docx, .pdf, .txt, .rtf');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploadError('');
    setUploading(true);
    try {
      await uploadManuscript(file);
      queryClient.invalidateQueries({ queryKey: ['manuscripts'] });
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manuscripts</h1>
          <p className="text-slate-500 mt-1">Upload and analyze your manuscripts</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.txt,.rtf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? 'Uploading...' : 'Upload Manuscript'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {uploadError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !manuscripts?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No manuscripts yet</h3>
          <p className="text-slate-400 mb-6">Upload your first manuscript to get started</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
          >
            <Upload className="h-5 w-5" />
            Upload Manuscript
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {manuscripts.map((m: Manuscript) => {
            const status = statusConfig[m.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            return (
              <Link
                key={m.id}
                to={`/manuscripts/${m.id}`}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{m.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span>{m.original_filename}</span>
                        <span>{m.word_count.toLocaleString()} words</span>
                        <span>{m.chapter_count} chapter{m.chapter_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 ${status.color}`}>
                      <StatusIcon className={`h-5 w-5 ${m.status === 'ANALYZING' || m.status === 'EXTRACTING' ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium">{status.label}</span>
                      {m.status === 'ANALYZING' && (
                        <span className="text-xs">({Math.round(m.progress_percent)}%)</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm('Delete this manuscript?')) {
                          deleteMutation.mutate(m.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {m.status === 'ERROR' && m.error_message && (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {m.error_message}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
