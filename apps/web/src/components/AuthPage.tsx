import { ArrowIcon } from './ArrowIcon';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '../auth/store';
import type { AuthCopy } from '../auth/copy';
export function AuthPage({
  mode,
  t,
}: {
  mode: 'login' | 'register';
  t: AuthCopy;
}) {
  const auth = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    auth.clearError();
  }, [mode]);
  useEffect(() => {
    if (auth.status === 'authenticated') location.hash = '/lobby';
  }, [auth.status]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      await auth.authenticate(mode, {
        email,
        password,
        ...(mode === 'register' ? { username } : {}),
      })
    )
      location.hash = '/lobby';
  }
  return (
    <main className="auth-page">
      <div className="auth-heading">
        <span className="eyebrow">SANGAT CHESS CLUB</span>
        <h1>{mode === 'login' ? t.welcome : t.registerTitle}</h1>
        <p>{t.subtitle}</p>
      </div>
      <section className="auth-card card">
        <h2>{mode === 'login' ? t.signIn : t.register}</h2>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              {t.username}
              <input
                aria-label={t.username}
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]+"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <small>{t.usernameHelp}</small>
            </label>
          )}
          <label>
            {t.email}
            <input
              aria-label={t.email}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t.password}
            <input
              aria-label={t.password}
              name="password"
              type="password"
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              required
              minLength={8}
              maxLength={128}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small>{t.passwordHelp}</small>
          </label>
          {auth.error && (
            <p role="alert" className="auth-error">
              {t[auth.error] || t.SERVICE_UNAVAILABLE}
            </p>
          )}
          <button className="primary" disabled={auth.busy}>
            {auth.busy ? t.loading : mode === 'login' ? t.signIn : t.register}
          </button>
        </form>
        <p>
          {mode === 'login' ? t.noAccount : t.hasAccount}{' '}
          <a href={mode === 'login' ? '#/register' : '#/login'}>
            {mode === 'login' ? t.register : t.signIn}
          </a>
        </p>
        <button
          className="guest-button"
          disabled={auth.busy}
          onClick={async () => {
            if (await auth.authenticate('guest')) location.hash = '/lobby';
          }}
        >
          {t.guest}
        </button>
        <small>{t.guestNote}</small>
      </section>
      <p className="auth-local-note">
        {t.localNote}{' '}
        <a href="#/play">
          {t.local} <ArrowIcon />
        </a>
      </p>
    </main>
  );
}
