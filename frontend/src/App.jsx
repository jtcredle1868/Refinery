import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import Upload from './components/Upload/Upload';
import ManuscriptView from './components/Analysis/ManuscriptView';
import IntelligenceEngine from './components/IntelligenceEngine/IntelligenceEngine';
import ProseRefineryView from './components/ProseRefinery/ProseRefineryView';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-refinery-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-refinery-blue mx-auto"></div>
          <p className="mt-4 text-refinery-slate">Loading Refinery...</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="manuscript/:id" element={<ManuscriptView />} />
            <Route path="manuscript/:id/intelligence" element={<IntelligenceEngine />} />
            <Route path="manuscript/:id/prose" element={<ProseRefineryView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
