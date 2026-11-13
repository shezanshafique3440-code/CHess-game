import { useEffect, useState } from 'react';
import App from './App';
import { AuthPage } from './components/AuthPage';
import { LobbyPage } from './components/LobbyPage';
import { useAuthStore } from './auth/store';
import { authCopy } from './auth/copy';
import { getSetting, saveSetting } from './game';
export default function AuthShell() {
  const [route, setRoute] = useState(location.hash);
  const [language, setLanguage] = useState<'en' | 'ur'>(
    getSetting('sangat-language', 'en') === 'ur' ? 'ur' : 'en',
  );
  const auth = useAuthStore();
  const t = authCopy[language];
  useEffect(() => {
    const changed = () => setRoute(location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setLanguage(document.documentElement.lang === 'ur' ? 'ur' : 'en'),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);
  useEffect(() => {
    void auth.refresh();
  }, [route]);
  useEffect(() => {
    if (route === '#/lobby' && auth.status === 'anonymous')
      location.hash = '/login';
  }, [route, auth.status]);
  const accountRoute = ['#/login', '#/register', '#/lobby'].includes(route);
  return (
    <>
      <div className="account-strip">
        <a href="#/play">{t.local}</a>
        <a href="#/lobby">{t.lobby}</a>
        {auth.user ? (
          <span>{auth.user.username}</span>
        ) : (
          <a href="#/login">{t.signIn}</a>
        )}
        {accountRoute && (
          <button
            onClick={() => {
              const next = language === 'en' ? 'ur' : 'en';
              saveSetting('sangat-language', next);
              setLanguage(next);
            }}
          >
            {t.language}
          </button>
        )}
      </div>
      {!accountRoute ? (
        <App />
      ) : route === '#/lobby' ? (
        auth.status === 'authenticated' ? (
          <LobbyPage t={t} language={language} />
        ) : (
          <main className="auth-page" role="status">
            {t.checking}
          </main>
        )
      ) : (
        <AuthPage
          key={route}
          mode={route === '#/register' ? 'register' : 'login'}
          t={t}
        />
      )}
    </>
  );
}
