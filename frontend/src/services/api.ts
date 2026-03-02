import axios from 'axios';
import type { ApiResponse, AuthResponse, Manuscript, EditQueueItem } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
          const newToken = res.data.data.access_token;
          localStorage.setItem('access_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data: { email: string; password: string; full_name: string; tier?: string }) =>
  api.post<ApiResponse<AuthResponse>>('/auth/register', data);

export const login = (data: { email: string; password: string }) =>
  api.post<ApiResponse<AuthResponse>>('/auth/login', data);

export const getMe = () => api.get<ApiResponse<any>>('/auth/me');

// Manuscripts
export const uploadManuscript = (file: File, title?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  return api.post<ApiResponse<Manuscript>>('/manuscripts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getManuscripts = () => api.get<ApiResponse<Manuscript[]>>('/manuscripts');

export const getManuscript = (id: number) => api.get<ApiResponse<Manuscript>>(`/manuscripts/${id}`);

export const getManuscriptStatus = (id: number) => api.get<ApiResponse<any>>(`/manuscripts/${id}/status`);

export const deleteManuscript = (id: number) => api.delete<ApiResponse<any>>(`/manuscripts/${id}`);

// Analysis
export const analyzeManuscript = (id: number, modules?: string[]) =>
  api.post<ApiResponse<any>>(`/manuscripts/${id}/analyze`, modules ? { modules } : {});

export const getAnalysisResult = (id: number, module: string) =>
  api.get<ApiResponse<any>>(`/manuscripts/${id}/analysis/${module}`);

export const getAllAnalysisResults = (id: number) =>
  api.get<ApiResponse<any>>(`/manuscripts/${id}/analysis`);

// Edit Queue
export const getEditQueue = (id: number, status?: string) =>
  api.get<ApiResponse<EditQueueItem[]>>(`/manuscripts/${id}/edit-queue`, { params: status ? { status_filter: status } : {} });

export const updateEditQueueItem = (manuscriptId: number, itemId: number, status: string) =>
  api.patch<ApiResponse<any>>(`/manuscripts/${manuscriptId}/edit-queue/${itemId}`, { status });

// Export
export const exportManuscript = (id: number, format: string, reportType = 'analysis') =>
  api.post(`/manuscripts/${id}/export`, { format, report_type: reportType }, { responseType: 'blob' });

export const generateReaderReport = (id: number) =>
  api.post(`/manuscripts/${id}/reports/reader`, {}, { responseType: 'blob' });

export default api;
