import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadManuscript } from '../../services/api';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    setError('');
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['docx', 'txt', 'rtf', 'pdf'].includes(ext)) {
      setError('Unsupported file type. Please upload .docx, .txt, .rtf, or .pdf');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadManuscript(file);
      navigate(`/manuscript/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-display text-ink mb-2">Upload Manuscript</h1>
      <p className="text-ink/60 mb-8">
        Upload your manuscript and Refinery will perform a full structural X-ray diagnostic in under 90 seconds.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-plum bg-blue-50'
            : file
            ? 'border-plum bg-green-50'
            : 'border-slate-300 hover:border-plum hover:bg-ink/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.txt,.rtf,.pdf"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        {file ? (
          <div>
            <CheckCircle className="h-12 w-12 text-plum mx-auto mb-3" />
            <p className="font-medium text-ink">{file.name}</p>
            <p className="text-sm text-ink/60 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-sm text-plum mt-2">Ready to upload</p>
          </div>
        ) : (
          <div>
            <UploadIcon className="h-12 w-12 text-ink/40 mx-auto mb-3" />
            <p className="font-medium text-ink">Drop your manuscript here</p>
            <p className="text-sm text-ink/40 mt-1">or click to browse</p>
            <p className="text-xs text-ink/40 mt-3">Supports .docx, .txt, .rtf, .pdf (max 50MB)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mt-4 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full mt-6 bg-ink text-parchment py-3 rounded-full font-medium text-sm uppercase tracking-wider hover:bg-ink/80 disabled:opacity-50 transition flex items-center justify-center space-x-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-parchment"></div>
              <span>Uploading & parsing...</span>
            </>
          ) : (
            <>
              <UploadIcon className="h-5 w-5" />
              <span>Upload & Analyze</span>
            </>
          )}
        </button>
      )}

      {/* Supported formats */}
      <div className="mt-8 bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="font-medium text-ink mb-3">Supported Formats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { ext: '.docx', label: 'Word Document' },
            { ext: '.txt', label: 'Plain Text' },
            { ext: '.rtf', label: 'Rich Text' },
            { ext: '.pdf', label: 'PDF Document' },
          ].map((f) => (
            <div key={f.ext} className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4 text-ink/60" />
              <span className="font-medium">{f.ext}</span>
              <span className="text-ink/40">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
