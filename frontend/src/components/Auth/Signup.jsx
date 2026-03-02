import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signup } from '../../services/api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signup(email, password, fullName);
      loginUser(res.data.access_token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-ink/10 bg-white/90 p-8 shadow-2xl"
      >
        <h1 className="font-display text-3xl text-ink">Begin your craft</h1>
        <p className="text-sm text-ink/60">Start with the Free tier — upgrade to Pro anytime.</p>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <label className="block">
          <span className="text-sm font-semibold text-ink">Full Name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 px-4 py-3"
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 px-4 py-3"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 px-4 py-3"
            placeholder="Create a password"
            required
            minLength={8}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-wider text-parchment disabled:bg-ink/40"
        >
          {loading ? 'Creating account…' : 'Create free account'}
        </button>

        <p className="text-center text-sm text-ink/60">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-plum">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
