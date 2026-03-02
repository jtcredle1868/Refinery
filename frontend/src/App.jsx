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
import VoiceIsolationView from './components/VoiceIsolation/VoiceIsolationView';
import PacingArchitectView from './components/PacingArchitect/PacingArchitectView';
import CharacterArcView from './components/CharacterArc/CharacterArcView';
import RevisionCenterView from './components/RevisionCenter/RevisionCenterView';
import ArgumentCoherenceView from './components/Academic/ArgumentCoherenceView';
import CitationArchitectureView from './components/Academic/CitationArchitectureView';
import AcademicVoiceView from './components/Academic/AcademicVoiceView';
import AdvisorDashboardView from './components/Academic/AdvisorDashboardView';
import TriageDashboardView from './components/Enterprise/TriageDashboardView';
import BatchUploadView from './components/Enterprise/BatchUploadView';
import ReaderReportView from './components/Enterprise/ReaderReportView';
import RejectionLetterView from './components/Enterprise/RejectionLetterView';
import DecisionWorkflowView from './components/Enterprise/DecisionWorkflowView';
import LandingPage from './components/Landing/LandingPage';
import ProcessingView from './components/Analysis/ProcessingView';

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

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/welcome" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected app routes */}
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
            <Route path="batch-upload" element={<BatchUploadView />} />

            {/* Manuscript analysis routes */}
            <Route path="manuscript/:id" element={<ManuscriptView />} />
            <Route path="manuscript/:id/intelligence" element={<IntelligenceEngine />} />
            <Route path="manuscript/:id/prose" element={<ProseRefineryView />} />
            <Route path="manuscript/:id/voice" element={<VoiceIsolationView />} />
            <Route path="manuscript/:id/pacing" element={<PacingArchitectView />} />
            <Route path="manuscript/:id/characters" element={<CharacterArcView />} />
            <Route path="manuscript/:id/revision" element={<RevisionCenterView />} />
            <Route path="manuscript/:id/processing" element={<ProcessingView />} />

            {/* Academic routes */}
            <Route path="manuscript/:id/argument" element={<ArgumentCoherenceView />} />
            <Route path="manuscript/:id/citations" element={<CitationArchitectureView />} />
            <Route path="manuscript/:id/academic-voice" element={<AcademicVoiceView />} />
            <Route path="advisor" element={<AdvisorDashboardView />} />

            {/* Enterprise routes */}
            <Route path="triage" element={<TriageDashboardView />} />
            <Route path="manuscript/:id/reader-report" element={<ReaderReportView />} />
            <Route path="manuscript/:id/rejection" element={<RejectionLetterView />} />
            <Route path="manuscript/:id/workflow" element={<DecisionWorkflowView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
