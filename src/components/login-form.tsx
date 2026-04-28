'use client';

import { useState } from 'react';

type LoginFormProps = {
  onLoginSuccess: () => void;
  onBack: () => void;
};

export function LoginForm({ onLoginSuccess, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      // Login successful
      onLoginSuccess();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Back button */}
        <button className="login-back-btn" onClick={onBack}>
          ← Back to Home
        </button>

        {/* Login card */}
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand">
              <div className="login-brand-dot" />
              <span className="login-brand-name">TaskOps</span>
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to access your operations workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading || !email || !password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-demo-info">
            <h3 className="login-demo-title">Demo Credentials</h3>
            <div className="login-demo-list">
              <div className="login-demo-item">
                <span className="login-demo-label">Email:</span>
                <code className="login-demo-code">shift.lead@agrireports.local</code>
              </div>
              <div className="login-demo-item">
                <span className="login-demo-label">Password:</span>
                <code className="login-demo-code">demo123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
