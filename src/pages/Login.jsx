import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import heroImg from '../assets/login-hero.svg';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-split">
      <aside className="login-visual" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="login-visual-overlay">
          <div className="login-visual-top">
            <span className="login-visual-badge">Admin Console</span>
          </div>
          <div className="login-visual-copy">
            <h1>Goodwill Printers</h1>
            <p className="login-visual-tagline">Diaries Manufacturers</p>
            <p className="login-visual-lead">
              Manage your catalogue, sections, products and enquiries — all from one
              place.
            </p>
          </div>
          <div className="login-visual-foot">
            &copy; {new Date().getFullYear()} Goodwill Printers. All rights reserved.
          </div>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-form-wrap">
          <div className="brand">
            <img
              src="/brand/goodwill-printers.png"
              alt="Goodwill Printers"
              className="login-logo"
            />
            <div className="brand-sub">Admin Sign In</div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="you@goodwillprinters.com"
              />
            </div>
            <div className="form-group">
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="login-help muted">
            Authorised personnel only. Contact your administrator for access.
          </p>
        </div>
      </main>
    </div>
  );
}
