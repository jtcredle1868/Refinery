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

// ---------------------------------------------------------------------------
// Enterprise — Organization
// ---------------------------------------------------------------------------
export const createOrganization = (name, primaryContactEmail) =>
  api.post('/enterprise/org', { name, primary_contact_email: primaryContactEmail });

export const getOrganization = () => api.get('/enterprise/org');

export const addOrgSeat = (userEmail, role = 'reader') =>
  api.post('/enterprise/org/seats', { user_email: userEmail, role });

export const updateOrgSeat = (membershipId, role) =>
  api.patch(`/enterprise/org/seats/${membershipId}`, { role });

export const removeOrgSeat = (membershipId) =>
  api.delete(`/enterprise/org/seats/${membershipId}`);

export const regenerateApiKey = () =>
  api.post('/enterprise/org/regenerate-key');

// ---------------------------------------------------------------------------
// Enterprise — Annotations
// ---------------------------------------------------------------------------
export const createAnnotation = (manuscriptId, content, chapterNum = null, locationHint = null, annotationType = 'comment') =>
  api.post('/enterprise/annotations', {
    manuscript_id: manuscriptId,
    chapter_num: chapterNum,
    location_hint: locationHint,
    content,
    annotation_type: annotationType,
  });

export const listAnnotations = (manuscriptId) =>
  api.get(`/enterprise/annotations/${manuscriptId}`);

export const updateAnnotation = (annotationId, content) =>
  api.put(`/enterprise/annotations/${annotationId}`, { content });

export const deleteAnnotation = (annotationId) =>
  api.delete(`/enterprise/annotations/${annotationId}`);

// ---------------------------------------------------------------------------
// Enterprise — Decision Workflow
// ---------------------------------------------------------------------------
export const getWorkflow = (manuscriptId) =>
  api.get(`/enterprise/workflow/${manuscriptId}`);

export const advanceWorkflow = (manuscriptId, notes = '', outcome = null) =>
  api.post('/enterprise/workflow/advance', {
    manuscript_id: manuscriptId,
    notes,
    outcome,
  });

// ---------------------------------------------------------------------------
// Enterprise — Batch Actions
// ---------------------------------------------------------------------------
export const batchAssign = (manuscriptIds, assignToEmail) =>
  api.post('/enterprise/batch/assign', {
    manuscript_ids: manuscriptIds,
    assign_to_email: assignToEmail,
  });

export const batchPass = (manuscriptIds) =>
  api.post('/enterprise/batch/pass', { manuscript_ids: manuscriptIds });

export const batchExportCsv = (manuscriptIds) =>
  api.post('/enterprise/batch/export-csv', { manuscript_ids: manuscriptIds }, { responseType: 'blob' });

// ---------------------------------------------------------------------------
// Advisor — Student Management
// ---------------------------------------------------------------------------
export const createInviteCode = () => api.post('/advisor/invite');

export const redeemInviteCode = (code) =>
  api.post(`/advisor/redeem?code=${encodeURIComponent(code)}`);

export const listStudents = () => api.get('/advisor/students');

export const listStudentManuscripts = (studentId) =>
  api.get(`/advisor/students/${studentId}/manuscripts`);

// ---------------------------------------------------------------------------
// Advisor — Annotations
// ---------------------------------------------------------------------------
export const createAdvisorAnnotation = (manuscriptId, content, chapterNum = null, locationHint = null) =>
  api.post('/advisor/annotations', {
    manuscript_id: manuscriptId,
    chapter_num: chapterNum,
    location_hint: locationHint,
    content,
  });

export const listAdvisorAnnotations = (manuscriptId) =>
  api.get(`/advisor/annotations/${manuscriptId}`);

// ---------------------------------------------------------------------------
// Advisor — Progress Tracking
// ---------------------------------------------------------------------------
export const getProgressTracking = (manuscriptId) =>
  api.get(`/advisor/progress/${manuscriptId}`);

// ---------------------------------------------------------------------------
// Payments (Stripe)
// ---------------------------------------------------------------------------
export const createCheckoutSession = (priceId, successUrl, cancelUrl) =>
  api.post('/payments/create-checkout-session', {
    price_id: priceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

export const createPortalSession = () =>
  api.post('/payments/create-portal-session');

export const getSubscriptionStatus = () =>
  api.get('/payments/subscription');

export default api;
