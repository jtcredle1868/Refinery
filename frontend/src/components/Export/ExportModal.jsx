import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import api from '../../services/api';

const exportOptions = [
  {
    type: 'clean_docx',
    label: 'Clean Manuscript',
    description: 'DOCX with all accepted changes applied. Ready to submit or share.',
    format: 'docx',
  },
  {
    type: 'tracked_docx',
    label: 'Tracked Changes',
    description: 'DOCX with all findings embedded as tracked changes and comments.',
    format: 'docx',
  },
  {
    type: 'pdf_report',
    label: 'Analysis Report',
    description: 'DOCX summary report with scores, findings, and recommendations.',
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
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-3xl border border-ink/10 bg-white/95 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-ink/50 mb-1">Export</p>
          <h2 className="font-display text-2xl text-ink">
            Export Manuscript
          </h2>
          {manuscriptTitle && (
            <p className="text-sm text-ink/60 mt-1 truncate">
              {manuscriptTitle}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        {/* Export options */}
        <div className="space-y-3">
          {exportOptions.map((option) => {
            const isLoading = loadingType === option.type;

            return (
              <div
                key={option.type}
                className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white/80 p-4 hover:bg-ink/[0.03] transition-colors cursor-pointer"
                onClick={() => !loadingType && handleExport(option)}
              >
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {option.label}
                  </h3>
                  <p className="text-xs text-ink/60">{option.description}</p>
                </div>
                <button
                  disabled={!!loadingType}
                  className="ml-4 rounded-full bg-ink/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink/70 hover:bg-ink hover:text-parchment transition-colors disabled:opacity-40"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-3 w-3 animate-spin" />
                      Generating…
                    </span>
                  ) : (
                    'Download'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-ink/40 text-center mt-6">
          Exports are generated from your latest completed analysis.
        </p>
      </div>
    </div>
  );
}
