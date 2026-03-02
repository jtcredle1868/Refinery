import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { uploadManuscript } from '../../services/api';
import {
  Upload, FileText, CheckCircle, AlertCircle, X, FolderUp, Loader, ExternalLink,
} from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['docx', 'txt', 'rtf', 'pdf'];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BatchUploadView() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const addFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList)
      .filter((f) => {
        const ext = f.name.split('.').pop().toLowerCase();
        return ACCEPTED_EXTENSIONS.includes(ext);
      })
      .map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
        status: 'pending',
        error: null,
        manuscriptId: null,
      }));

    if (newFiles.length === 0) return;
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);
    setResults([]);
    const total = files.length;
    setUploadProgress({ current: 0, total });

    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      );

      try {
        const res = await uploadManuscript(files[i].file);
        const manuscriptId = res.data.id;
        const title = res.data.title || files[i].name;

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'done', manuscriptId } : f
          )
        );

        uploadResults.push({
          name: files[i].name,
          title,
          manuscriptId,
          success: true,
        });
      } catch (err) {
        const errorMsg = err.response?.data?.detail || 'Upload failed';
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: errorMsg } : f
          )
        );

        uploadResults.push({
          name: files[i].name,
          title: files[i].name,
          manuscriptId: null,
          success: false,
          error: errorMsg,
        });
      }

      setUploadProgress({ current: i + 1, total });
    }

    setResults(uploadResults);
    setUploading(false);
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-ink/40" />;
      case 'uploading':
        return <Loader className="h-4 w-4 text-plum animate-spin" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'uploading': return 'Uploading...';
      case 'done': return 'Done';
      case 'error': return 'Error';
      default: return status;
    }
  };

  const statusLabelClasses = (status) => {
    switch (status) {
      case 'pending': return 'bg-ink/10 text-ink/70';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-ink/10 text-ink/70';
    }
  };

  const completedCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const progressPercent = uploadProgress.total > 0
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">Batch Upload</h1>
        <p className="text-ink/60 mt-1">
          Upload multiple manuscripts at once for enterprise-scale processing.
        </p>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-plum bg-blue-50'
            : 'border-slate-300 hover:border-plum hover:bg-ink/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.txt,.rtf,.pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <FolderUp className="h-12 w-12 text-ink/40 mx-auto mb-3" />
        <p className="font-medium text-ink">Drop manuscripts here</p>
        <p className="text-sm text-ink/40 mt-1">or click to browse</p>
        <p className="text-xs text-ink/40 mt-3">
          Supports .docx, .txt, .rtf, .pdf -- select multiple files at once
        </p>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display text-ink">
              File Queue ({files.length} {files.length === 1 ? 'file' : 'files'})
            </h2>
            {!uploading && results.length === 0 && (
              <button
                onClick={() => setFiles([])}
                className="text-sm text-ink/40 hover:text-red-500 transition"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Progress bar (shown during upload) */}
          {uploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-ink/70 mb-1">
                <span>Uploading {uploadProgress.current} of {uploadProgress.total}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className="bg-ink h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-auto">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-ink/5 border border-slate-100"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {statusIcon(f.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{f.name}</p>
                    <p className="text-xs text-ink/40">{formatFileSize(f.size)}</p>
                    {f.error && (
                      <p className="text-xs text-red-500 mt-0.5">{f.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabelClasses(f.status)}`}>
                    {statusLabel(f.status)}
                  </span>
                  {f.status === 'pending' && !uploading && (
                    <button
                      onClick={() => removeFile(i)}
                      className="text-ink/40 hover:text-red-500 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload All button */}
          {!uploading && results.length === 0 && files.some((f) => f.status === 'pending') && (
            <button
              onClick={handleUploadAll}
              className="w-full mt-4 bg-ink text-parchment py-3 rounded-full font-medium uppercase tracking-wider hover:bg-ink/80 transition flex items-center justify-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Upload All ({files.filter((f) => f.status === 'pending').length} files)</span>
            </button>
          )}
        </div>
      )}

      {/* Results summary */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
          <h2 className="text-lg font-display text-ink mb-4">Upload Results</h2>

          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-ink/70">{completedCount} succeeded</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center space-x-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-ink/70">{errorCount} failed</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
                  r.success ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {r.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{r.title}</p>
                    {r.error && <p className="text-xs text-red-500">{r.error}</p>}
                  </div>
                </div>
                {r.success && r.manuscriptId && (
                  <Link
                    to={`/manuscript/${r.manuscriptId}`}
                    className="flex items-center space-x-1 text-xs text-plum hover:underline flex-shrink-0 ml-3"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => { setFiles([]); setResults([]); }}
            className="w-full mt-4 border border-slate-300 text-ink/80 py-2.5 rounded-lg font-medium hover:bg-ink/5 transition"
          >
            Upload More Files
          </button>
        </div>
      )}
    </div>
  );
}
