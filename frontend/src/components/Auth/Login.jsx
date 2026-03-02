import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/api';
import { BookOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      loginUser(res.data.access_token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-refinery-navy to-slate-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="h-12 w-12 text-plum mx-auto mb-3" />
          <h1 className="text-3xl font-display text-white">REFINERY</h1>
          <p className="text-ink/40 mt-1">Where Prose Becomes Perfect</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-ink mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-refinery-blue focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-refinery-blue focus:border-transparent outline-none transition"
                placeholder="Your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-ink text-parchment py-2.5 rounded-full text-sm font-medium uppercase tracking-wider hover:bg-ink/80 disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="mt-4 text-center text-sm text-ink/70">
            Don't have an account?{' '}
            <Link to="/signup" className="text-plum font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
