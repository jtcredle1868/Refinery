import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from './hooks/useAuth';
import type { User } from './types';
import { getMe } from './services/api';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ManuscriptPage from './pages/ManuscriptPage';
import AnalysisPage from './pages/AnalysisPage';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  const loginFn = useCallback((accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.data.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, logout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, token, login: loginFn, logout, isAuthenticated: !!token }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
            <Route path="/" element={token ? <Layout /> : <Navigate to="/login" />}>
              <Route index element={<DashboardPage />} />
              <Route path="manuscripts/:id" element={<ManuscriptPage />} />
              <Route path="manuscripts/:id/analysis/:module" element={<AnalysisPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
