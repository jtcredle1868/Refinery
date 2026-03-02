import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadManuscript } from '../../services/api';

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
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.4em] text-ink/60">Upload</p>
        <h1 className="font-display text-3xl text-ink">Submit a manuscript</h1>
        <p className="text-ink/70">
          Upload your prose and Refinery will perform a full structural X-ray in under 90 seconds.
        </p>
      </header>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-plum bg-plum/5'
            : file
            ? 'border-plum/40 bg-white/90'
            : 'border-ink/20 bg-white/60 hover:border-plum/40 hover:bg-white/80'
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
            <p className="text-xs uppercase tracking-[0.4em] text-plum mb-2">Ready to upload</p>
            <p className="text-xl font-semibold text-ink">{file.name}</p>
            <p className="text-sm text-ink/60 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-semibold text-ink mb-1">Drop your manuscript here</p>
            <p className="text-sm text-ink/60">or click to browse</p>
            <p className="text-xs text-ink/40 mt-3">Supports .docx, .txt, .rtf, .pdf (max 50MB)</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-wider text-parchment disabled:bg-ink/40 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-parchment"></div>
              <span>Uploading & parsing…</span>
            </>
          ) : (
            <span>Upload & analyze</span>
          )}
        </button>
      )}

      {/* Supported formats */}
      <div className="rounded-3xl border border-ink/10 bg-white/90 p-6">
        <h3 className="font-semibold text-ink mb-3">Supported formats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { ext: '.docx', label: 'Word Document' },
            { ext: '.txt', label: 'Plain Text' },
            { ext: '.rtf', label: 'Rich Text' },
            { ext: '.pdf', label: 'PDF Document' },
          ].map((f) => (
            <div key={f.ext} className="text-sm text-ink/70">
              <span className="font-semibold text-ink">{f.ext}</span>{' '}
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
