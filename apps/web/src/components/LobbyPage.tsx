import { ArrowIcon } from './ArrowIcon';
import { useAuthStore } from '../auth/store';
import type { AuthCopy } from '../auth/copy';
export function LobbyPage({
  t,
  language,
}: {
  t: AuthCopy;
  language: 'en' | 'ur';
}) {
  const auth = useAuthStore();
  if (!auth.user) return null;
  const user = auth.user;
  return (
    <main className="auth-page">
      <div className="auth-heading">
        <span className="eyebrow">{t.lobby}</span>
        <h1>{t.lobbyTitle}</h1>
        <p>{t.lobbySubtitle}</p>
      </div>
      <section className="auth-card card">
        <h2>{t.profile}</h2>
        <div className="lobby-avatar" aria-hidden="true">
          ♞
        </div>
        <h3>{user.username}</h3>
        <p>{user.isGuest ? t.temporary : t.member}</p>
        <dl className="profile-details">
          <div>
            <dt>{t.rating}</dt>
            <dd>{user.rating}</dd>
          </div>
          {user.email && (
            <div>
              <dt>{t.email}</dt>
              <dd dir="ltr">{user.email}</dd>
            </div>
          )}
          {user.expiresAt && (
            <div>
              <dt>{t.expires}</dt>
              <dd>
                {new Date(user.expiresAt).toLocaleString(
                  language === 'ur' ? 'ur-PK' : 'en-GB',
                )}
              </dd>
            </div>
          )}
        </dl>
        <p className="auth-secured">{t.secured}</p>
        <a className="primary" href="#/play">
          {t.local} <ArrowIcon />
        </a>
        {auth.error && (
          <p role="alert">{t[auth.error] || t.SERVICE_UNAVAILABLE}</p>
        )}
        <button
          className="guest-button"
          disabled={auth.busy}
          onClick={async () => {
            if (await auth.logout()) location.hash = '/login';
          }}
        >
          {auth.busy ? t.loading : t.logout}
        </button>
      </section>
    </main>
  );
}
