import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Upload, LayoutDashboard, LogOut } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-refinery-bg">
      {/* Top nav */}
      <header className="bg-refinery-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-refinery-light-blue" />
              <div>
                <span className="text-xl font-display font-bold">REFINERY</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">Where Prose Becomes Perfect</span>
              </div>
            </Link>

            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/upload"
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-slate-600">
                <span className="text-sm text-slate-400">{user?.email}</span>
                <span className="text-xs bg-refinery-blue px-2 py-0.5 rounded-full uppercase">
                  {user?.tier || 'free'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-white transition"
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
