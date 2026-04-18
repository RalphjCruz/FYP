import { useMemo, useState } from 'react';
import type { AuthMode } from '../types';

const PASSWORD_REQUIREMENTS_NOTE = 'Use at least 8 characters with 1 uppercase letter, 1 special character, and 1 number.';
const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type AuthCardProps = {
  loading: boolean;
  error: string | null;
  onSubmit: (mode: AuthMode, payload: { username?: string; email: string; password: string }) => Promise<boolean>;
  onClearError: () => void;
};

export const AuthCard = ({ loading, error, onSubmit, onClearError }: AuthCardProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMeetsPolicy = mode === 'login' || PASSWORD_POLICY_REGEX.test(password);
  const passwordsMatch = mode === 'login' || password === confirmPassword;
  const hasConfirmPassword = mode === 'login' || confirmPassword.length > 0;
  const showPasswordPolicyError = mode === 'register' && password.length > 0 && !passwordMeetsPolicy;
  const showPasswordMismatch = mode === 'register' && hasConfirmPassword && !passwordsMatch;

  const canSubmit = useMemo(() => {
    const hasEmail = email.trim().length > 0;
    const hasPassword = password.length > 0;
    const hasUsername = mode === 'login' || username.trim().length > 0;
    return hasEmail && hasPassword && hasUsername && hasConfirmPassword && passwordMeetsPolicy && passwordsMatch;
  }, [email, hasConfirmPassword, mode, password, passwordMeetsPolicy, passwordsMatch, username]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    onClearError();
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const success = await onSubmit(mode, {
      username: username.trim(),
      email: email.trim(),
      password,
    });

    if (success) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setUsername('');
    }
  };

  return (
    <section className="auth-shell" aria-label="Authentication">
      <div className="auth-card">
        <h2>{mode === 'login' ? 'Welcome' : 'Create Your Account'}</h2>
        <p>{mode === 'login' ? 'Login to continue your slime journey.' : 'Register and start leveling up your productivity.'}</p>

        <div className="auth-mode-toggle">
          <button className={`tasks-filter-button ${mode === 'login' ? 'active' : ''}`} onClick={() => handleModeChange('login')}>
            Login
          </button>
          <button className={`tasks-filter-button ${mode === 'register' ? 'active' : ''}`} onClick={() => handleModeChange('register')}>
            Register
          </button>
        </div>

        <div className="auth-fields">
          {mode === 'register' && (
            <label className="tasks-field">
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  onClearError();
                }}
                placeholder="Your display name"
                autoComplete="username"
              />
            </label>
          )}

          <label className="tasks-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                onClearError();
              }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="tasks-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                onClearError();
              }}
              placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>
          {mode === 'register' && <p className="auth-password-note">{PASSWORD_REQUIREMENTS_NOTE}</p>}

          {mode === 'register' && (
            <label className="tasks-field">
              <span>Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  onClearError();
                }}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </label>
          )}
        </div>

        {showPasswordPolicyError && (
          <div className="auth-inline-error" role="alert">
            Password must include at least 1 uppercase letter, 1 special character, and 1 number.
          </div>
        )}

        {showPasswordMismatch && (
          <div className="auth-inline-error" role="alert">
            Passwords do not match.
          </div>
        )}

        {error && (
          <div className="tasks-empty-state">
            <p>{error}</p>
          </div>
        )}

        <button className="btn-cta" onClick={() => void handleSubmit()} disabled={!canSubmit || loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>

        {mode === 'register' && (
          <p className="auth-switch-note">
            Already have an account?{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => handleModeChange('login')}
            >
              Log in
            </button>
          </p>
        )}

        {mode === 'login' && (
          <p className="auth-switch-note">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => handleModeChange('register')}
            >
              Register
            </button>
          </p>
        )}
      </div>
    </section>
  );
};
