import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup, authError, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok =
      mode === 'login' ? await login(email, password) : await signup(name, email, password);
    if (ok) {
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Log in to reserve and book seats.'
            : 'Sign up to start booking event seats.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jordan Lee"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </label>

          {authError && <div className="auth-error">{authError}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={authLoading}>
            {authLoading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
