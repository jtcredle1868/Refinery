import { useState } from 'react';
import { X, Download, FileText, FileBarChart, Loader } from 'lucide-react';
import api from '../../services/api';

const exportOptions = [
  {
    type: 'clean_docx',
    label: 'Clean Manuscript',
    description: 'DOCX with all accepted changes applied. Ready to submit or share.',
    icon: Download,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    format: 'docx',
  },
  {
    type: 'tracked_docx',
    label: 'Tracked Changes',
    description: 'DOCX with all findings embedded as tracked changes and comments.',
    icon: FileText,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    format: 'docx',
  },
  {
    type: 'pdf_report',
    label: 'Analysis Report',
    description: 'DOCX summary report with scores, findings, and recommendations.',
    icon: FileBarChart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    format: 'docx',
  },
];

export default function ExportModal({ isOpen, onClose, manuscriptId, manuscriptTitle }) {
  const [loadingType, setLoadingType] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleExport = async (option) => {
    setLoadingType(option.type);
    setError('');

    try {
      const response = await api.post(
        '/exports/download',
        {
          manuscript_id: manuscriptId,
          export_type: option.type,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (manuscriptTitle || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeName}_${option.type}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.detail || `Failed to export ${option.label}. Please try again.`
      );
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-display font-bold text-slate-900">
            Export Manuscript
          </h2>
          {manuscriptTitle && (
            <p className="text-sm text-slate-500 mt-1 truncate">
              {manuscriptTitle}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Export options */}
        <div className="space-y-3">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isLoading = loadingType === option.type;

            return (
              <div
                key={option.type}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-blue-50 transition cursor-pointer group"
                onClick={() => !loadingType && handleExport(option)}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${option.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${option.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {option.label}
                    </h3>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </div>
                <button
                  disabled={!!loadingType}
                  className="flex-shrink-0 ml-4 flex items-center space-x-1 bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-400 text-center mt-6">
          Exports are generated from your latest completed analysis.
        </p>
      </div>
    </div>
  );
}
