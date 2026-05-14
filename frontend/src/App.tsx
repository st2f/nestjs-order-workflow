import { useMemo, useState } from 'react';
import type { LoginResponse } from './api/authApi';
import { LoginPage } from './pages/LoginPage';
import { DebugPage } from './pages/DebugPage';

const SESSION_STORAGE_KEY = 'orderflow.admin.session';

function readStoredSession(): LoginResponse | undefined {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : undefined;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return undefined;
  }
}

function storeSession(session: LoginResponse) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function App() {
  const [session, setSession] = useState<LoginResponse | undefined>(() =>
    readStoredSession(),
  );

  const userLabel = useMemo(() => session?.user.username ?? 'Admin', [session]);

  function handleLogin(nextSession: LoginResponse) {
    storeSession(nextSession);
    setSession(nextSession);
  }

  function handleLogout() {
    clearSession();
    setSession(undefined);
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DebugPage
      accessToken={session.accessToken}
      userLabel={userLabel}
      onLogout={handleLogout}
    />
  );
}
