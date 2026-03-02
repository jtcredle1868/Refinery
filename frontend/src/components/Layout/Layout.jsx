import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Upload, LayoutDashboard, LogOut, GraduationCap, Building2, FolderUp } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tier = user?.tier || 'free';
  const isAcademic = ['academic', 'advisor'].includes(tier);
  const isEnterprise = tier === 'enterprise';

  return (
    <div className="min-h-screen bg-parchment">
      {/* Top nav */}
      <header className="bg-ink text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-plum" />
              <div>
                <span className="text-xl font-display">REFINERY</span>
                <span className="hidden sm:inline text-xs text-ink/40 ml-2">Where Prose Becomes Perfect</span>
              </div>
            </Link>

            <nav className="flex items-center space-x-2">
              <Link
                to="/"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-ink/40 hover:text-white hover:bg-slate-700 transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/upload"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-ink/40 hover:text-white hover:bg-slate-700 transition"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Link>
              {isAcademic && (
                <Link
                  to="/advisor"
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-ink/40 hover:text-white hover:bg-slate-700 transition"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Advisor</span>
                </Link>
              )}
              {isEnterprise && (
                <>
                  <Link
                    to="/triage"
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-ink/40 hover:text-white hover:bg-slate-700 transition"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Triage</span>
                  </Link>
                  <Link
                    to="/batch-upload"
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-ink/40 hover:text-white hover:bg-slate-700 transition"
                  >
                    <FolderUp className="h-4 w-4" />
                    <span>Batch</span>
                  </Link>
                </>
              )}
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-slate-600">
                <span className="text-sm text-ink/40">{user?.email}</span>
                <span className="text-xs bg-ink px-2 py-0.5 rounded-full uppercase">
                  {tier}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-ink/40 hover:text-white transition"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
