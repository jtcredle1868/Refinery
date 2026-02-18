import axios from 'axios';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('refinery_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const signup = (email, password, fullName) =>
  api.post('/auth/signup', { email, password, full_name: fullName });

export const login = (email, password) => {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  return api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

export const getProfile = () => api.get('/auth/me');

export const upgradeTier = (tier) => api.patch('/auth/me/upgrade', { tier });

// Manuscripts
export const uploadManuscript = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/manuscripts/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const listManuscripts = () => api.get('/manuscripts/');

export const getManuscript = (id) => api.get(`/manuscripts/${id}`);

export const deleteManuscript = (id) => api.delete(`/manuscripts/${id}`);

// Analysis — supports all module types with optional params
export const runAnalysis = (manuscriptId, analysisType, options = {}) =>
  api.post('/analysis/run', {
    manuscript_id: manuscriptId,
    analysis_type: analysisType,
    ...options,
  });

export const getManuscriptAnalyses = (manuscriptId) =>
  api.get(`/analysis/manuscript/${manuscriptId}`);

export const getAnalysis = (id) => api.get(`/analysis/${id}`);

// Reports
export const generateCommitteeReport = (manuscriptId, templateType = 'full_draft_review', advisorNotes = '') =>
  api.post('/reports/committee', {
    manuscript_id: manuscriptId,
    template_type: templateType,
    advisor_notes: advisorNotes,
  });

export const generateReaderReport = (manuscriptId, authorName) =>
  api.post('/reports/reader', {
    manuscript_id: manuscriptId,
    author_name: authorName,
  });

export const generateRejectionLetter = (manuscriptId, authorName, tone = 'standard') =>
  api.post('/reports/rejection', {
    manuscript_id: manuscriptId,
    author_name: authorName,
    tone,
  });

// Exports
export const exportManuscript = (manuscriptId, exportType) =>
  api.post('/exports/download', {
    manuscript_id: manuscriptId,
    export_type: exportType,
  }, exportType.includes('docx') ? { responseType: 'blob' } : {});

export default api;
