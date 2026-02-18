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

// Analysis
export const runAnalysis = (manuscriptId, analysisType) =>
  api.post('/analysis/run', { manuscript_id: manuscriptId, analysis_type: analysisType });

export const getManuscriptAnalyses = (manuscriptId) =>
  api.get(`/analysis/manuscript/${manuscriptId}`);

export const getAnalysis = (id) => api.get(`/analysis/${id}`);

export default api;
