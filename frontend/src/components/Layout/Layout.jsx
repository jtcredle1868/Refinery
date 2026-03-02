import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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

  const navLinkClass = ({ isActive }) =>
    `flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition ${
      isActive
        ? 'bg-ink text-parchment'
        : 'text-ink/50 hover:text-ink hover:bg-ink/5'
    }`;

  return (
    <div className="min-h-screen bg-parchment">
      {/* Glassmorphic nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" end className="flex items-center space-x-3 group">
              <BookOpen className="h-7 w-7 text-plum group-hover:scale-110 transition-transform" />
              <span className="text-lg font-display uppercase tracking-[0.15em] text-ink">
                Refinery
              </span>
            </NavLink>

            <nav className="flex items-center space-x-1">
              <NavLink to="/" end className={navLinkClass}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
              <NavLink to="/upload" className={navLinkClass}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </NavLink>
              {isAcademic && (
                <NavLink to="/advisor" className={navLinkClass}>
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Advisor</span>
                </NavLink>
              )}
              {isEnterprise && (
                <>
                  <NavLink to="/triage" className={navLinkClass}>
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Triage</span>
                  </NavLink>
                  <NavLink to="/batch-upload" className={navLinkClass}>
                    <FolderUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Batch</span>
                  </NavLink>
                </>
              )}

              <div className="flex items-center space-x-3 ml-3 pl-3 border-l border-ink/10">
                <span className="text-xs text-ink/40 hidden sm:inline">{user?.email}</span>
                <span className="text-[10px] bg-plum/10 text-plum px-2.5 py-0.5 rounded-full uppercase font-semibold tracking-wider">
                  {tier}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-ink/30 hover:text-ink transition p-1 rounded-full hover:bg-ink/5"
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

      {/* Footer */}
      <footer className="border-t border-ink/10 py-8 mt-16">
        <p className="text-center text-xs text-ink/30 uppercase tracking-widest">
          Refinery &mdash; Where Prose Becomes Perfect
        </p>
      </footer>
    </div>
  );
}
