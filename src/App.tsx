import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientView } from './components/ClientView';
import { TopNavbar } from './components/TopNavbar';
import { listSessions } from './services/proofingRepository';
import type { AppViewMode, ProofingSession } from './types/proofing';

function readUrlState(): { mode: AppViewMode; sessionId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const sessionParam = params.get('session');
  if (sessionParam && sessionParam.trim()) {
    return { mode: 'client', sessionId: sessionParam.trim() };
  }
  return { mode: 'admin', sessionId: null };
}

function syncUrlState(mode: AppViewMode, sessionId: string | null): void {
  const url = new URL(window.location.href);
  if (mode === 'client' && sessionId) {
    url.searchParams.set('session', sessionId);
  } else {
    url.searchParams.delete('session');
  }
  window.history.pushState({}, '', `${url.pathname}${url.search}`);
}

export default function App() {
  const initial = readUrlState();
  const [mode, setMode] = useState<AppViewMode>(initial.mode);
  const [sessions, setSessions] = useState<ProofingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initial.sessionId
  );
  const [loadingSessions, setLoadingSessions] = useState(true);

  const refreshSessions = useCallback(async () => {
    const data = await listSessions();
    setSessions(data);
    setSelectedSessionId((prev) => {
      if (prev && data.some((s) => s.id === prev)) {
        return prev;
      }
      return data[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    setLoadingSessions(true);
    void refreshSessions().finally(() => setLoadingSessions(false));
  }, [refreshSessions]);

  useEffect(() => {
    const onPopState = () => {
      const next = readUrlState();
      setMode(next.mode);
      if (next.sessionId) {
        setSelectedSessionId(next.sessionId);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSwitchMode = (nextMode: AppViewMode) => {
    if (nextMode === 'client') {
      const targetId = selectedSessionId ?? sessions[0]?.id ?? null;
      if (!targetId) return;
      setSelectedSessionId(targetId);
      setMode('client');
      syncUrlState('client', targetId);
    } else {
      setMode('admin');
      syncUrlState('admin', null);
      void refreshSessions();
    }
  };

  const handleOpenClientPreview = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setMode('client');
    syncUrlState('client', sessionId);
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <TopNavbar
        mode={mode}
        onSwitchMode={handleSwitchMode}
        sessions={sessions}
        activeSessionId={selectedSessionId}
        onSelectPreviewSession={(id) => handleOpenClientPreview(id)}
      />

      {loadingSessions ? (
        <main className="container py-5 text-center text-secondary">
          <div className="spinner-border text-primary mb-2" role="status" />
          <p className="small mb-0">Memuat data studio...</p>
        </main>
      ) : mode === 'client' ? (
        <ClientView
          sessionId={selectedSessionId}
          onBackToAdmin={() => handleSwitchMode('admin')}
        />
      ) : (
        <AdminDashboard
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={(id) => setSelectedSessionId(id)}
          onRefreshSessions={refreshSessions}
          onOpenClientPreview={handleOpenClientPreview}
        />
      )}
    </div>
  );
}
