import { useMemo, useState } from 'react';
import type { AuthMode } from '../types';

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

  const canSubmit = useMemo(() => {
    const hasEmail = email.trim().length > 0;
    const hasPassword = password.length > 0;
    const hasUsername = mode === 'login' || username.trim().length > 0;
    return hasEmail && hasPassword && hasUsername;
  }, [email, mode, password, username]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setEmail('');
    setPassword('');
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
      setUsername('');
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl" aria-label="Authentication">
      <div className="gb-section-card bg-gb-panel/95">
        <header className="mb-6">
          <h2 className="font-display text-xl leading-relaxed text-gb-text sm:text-2xl md:text-3xl">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="mt-3 font-sans text-base leading-relaxed text-gb-text sm:text-lg">
            {mode === 'login'
              ? 'Login to continue your slime journey.'
              : 'Register and start leveling up your productivity.'}
          </p>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-3" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`rounded-lg border-2 px-4 py-3 font-sans text-base font-semibold transition sm:text-lg ${
              mode === 'login'
                ? 'border-gb-border bg-gb-bg text-gb-text'
                : 'border-gb-border bg-gb-panel text-gb-text hover:bg-gb-bg/70'
            }`}
            onClick={() => handleModeChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`rounded-lg border-2 px-4 py-3 font-sans text-base font-semibold transition sm:text-lg ${
              mode === 'register'
                ? 'border-gb-border bg-gb-bg text-gb-text'
                : 'border-gb-border bg-gb-panel text-gb-text hover:bg-gb-bg/70'
            }`}
            onClick={() => handleModeChange('register')}
          >
            Register
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-username" className="mb-2 block font-sans text-base font-semibold text-gb-text sm:text-lg">
                Username
              </label>
              <input
                id="auth-username"
                className="w-full rounded-lg border-2 border-gb-border bg-white px-4 py-3 font-sans text-base text-gb-text outline-none transition focus:ring-2 focus:ring-gb-progress sm:text-lg"
                type="text"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  onClearError();
                }}
                placeholder="Your display name"
                autoComplete="username"
                required={mode === 'register'}
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-2 block font-sans text-base font-semibold text-gb-text sm:text-lg">
              Email
            </label>
            <input
              id="auth-email"
              className="w-full rounded-lg border-2 border-gb-border bg-white px-4 py-3 font-sans text-base text-gb-text outline-none transition focus:ring-2 focus:ring-gb-progress sm:text-lg"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                onClearError();
              }}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-2 block font-sans text-base font-semibold text-gb-text sm:text-lg">
              Password
            </label>
            <input
              id="auth-password"
              className="w-full rounded-lg border-2 border-gb-border bg-white px-4 py-3 font-sans text-base text-gb-text outline-none transition focus:ring-2 focus:ring-gb-progress sm:text-lg"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                onClearError();
              }}
              placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
            />
          </div>

          {error && (
            <div className="rounded-lg border-2 border-red-900 bg-red-100 px-4 py-3" role="alert" aria-live="polite">
              <p className="font-sans text-base text-red-900 sm:text-lg">{error}</p>
            </div>
          )}

          <button
            className="w-full rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-lg font-bold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:opacity-60"
            type="submit"
            disabled={!canSubmit || loading}
            aria-busy={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </section>
  );
};
