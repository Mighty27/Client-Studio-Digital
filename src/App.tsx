import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ClientView } from './components/ClientView';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ProfileAccountPage } from './pages/admin/ProfileAccountPage';
import { SchedulePage } from './pages/admin/SchedulePage';
import { SessionsPage } from './pages/admin/SessionsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { TaskManagementPage } from './pages/admin/TaskManagementPage';
import { TeamAdminPage } from './pages/admin/TeamAdminPage';
import { TeamMemberDirectoryPage } from './pages/admin/TeamMemberDirectoryPage';
import { HiddenRegisterPage } from './pages/auth/HiddenRegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import {
  clearStoredAuthUserId,
  getStoredAuthUserId,
  listSchedules,
  listSessions,
  listTasks,
  listTeamMembers,
  setStoredAuthUserId,
  subscribeToWorkspaceUpdates,
} from './services/proofingRepository';
import type {
  ProofingSession,
  StudioSchedule,
  StudioTask,
  TeamMember,
} from './types/proofing';
import { canManageTeam } from './utils/proofingRules';

function getClientSessionParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('session');
  return value && value.trim().length > 0 ? value.trim() : null;
}

function isPreviewModeParam(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === '1';
}

export default function App() {
  const [clientSessionId, setClientSessionId] = useState<string | null>(() =>
    getClientSessionParam()
  );
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(() =>
    isPreviewModeParam()
  );
  const [sessions, setSessions] = useState<ProofingSession[]>([]);
  const [tasks, setTasks] = useState<StudioTask[]>([]);
  const [schedules, setSchedules] = useState<StudioSchedule[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(
    () => !getClientSessionParam()
  );

  const refreshSessions = useCallback(async () => {
    const items = await listSessions();
    setSessions(items);
  }, []);

  const refreshTasks = useCallback(async () => {
    const items = await listTasks();
    setTasks(items);
  }, []);

  const refreshSchedules = useCallback(async () => {
    const items = await listSchedules();
    setSchedules(items);
  }, []);

  const refreshMembers = useCallback(async () => {
    const items = await listTeamMembers();
    setMembers(items);
    const storedUserId = getStoredAuthUserId();
    if (storedUserId) {
      const matched = items.find((m) => m.id === storedUserId && m.is_active) ?? null;
      if (!matched) {
        clearStoredAuthUserId();
      }
      setCurrentUser(matched);
    } else {
      setCurrentUser(null);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    const [sessionItems, taskItems, scheduleItems, memberItems] = await Promise.all([
      listSessions(),
      listTasks(),
      listSchedules(),
      listTeamMembers(),
    ]);
    setSessions(sessionItems);
    setTasks(taskItems);
    setSchedules(scheduleItems);
    setMembers(memberItems);

    const storedUserId = getStoredAuthUserId();
    if (storedUserId) {
      const matched =
        memberItems.find((m) => m.id === storedUserId && m.is_active) ?? null;
      if (!matched) {
        clearStoredAuthUserId();
      }
      setCurrentUser(matched);
    } else {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setClientSessionId(getClientSessionParam());
      setIsPreviewMode(isPreviewModeParam());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (clientSessionId) return;

    let active = true;
    const init = async () => {
      setLoadingWorkspace(true);
      try {
        await refreshWorkspace();
      } finally {
        if (active) setLoadingWorkspace(false);
      }
    };
    void init();

    const unsubscribe = subscribeToWorkspaceUpdates(() => {
      void refreshWorkspace();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [clientSessionId, refreshWorkspace]);

  const handleOpenClientPreview = useCallback((sessionId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    url.searchParams.set('preview', '1');
    window.history.pushState({}, '', url.toString());
    setClientSessionId(sessionId);
    setIsPreviewMode(true);
  }, []);

  const handleExitPreview = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    url.searchParams.delete('preview');
    if (!url.pathname.startsWith('/admin')) {
      url.pathname = '/admin/dashboard';
    }
    window.history.pushState({}, '', url.toString());
    setClientSessionId(null);
    setIsPreviewMode(false);
  }, []);

  const handleAuthSuccess = useCallback(
    (user: TeamMember) => {
      setStoredAuthUserId(user.id);
      setCurrentUser(user);
      void refreshMembers();
    },
    [refreshMembers]
  );

  const handleLogout = useCallback(() => {
    clearStoredAuthUserId();
    setCurrentUser(null);
  }, []);

  // Client access checked outside BrowserRouter via ?session=<id>
  if (clientSessionId) {
    return (
      <ClientView
        sessionId={clientSessionId}
        onExitPreview={isPreviewMode ? handleExitPreview : undefined}
      />
    );
  }

  return (
    <BrowserRouter>
      {loadingWorkspace ? (
        <main
          className="container py-5 d-flex flex-column align-items-center justify-content-center text-secondary"
          style={{ minHeight: '100vh' }}
        >
          <div className="spinner-border text-primary mb-2" role="status" />
          <p className="small mb-0">Memuat ruang kerja studio...</p>
        </main>
      ) : (
        <Routes>
          {/* Public Login Route */}
          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <LoginPage
                  hasExistingAccounts={members.length > 0}
                  onLoginSuccess={handleAuthSuccess}
                />
              )
            }
          />

          {/* Hidden Registration Route (Not linked in Login or Client views) */}
          <Route
            path="/daftar-akun"
            element={
              <HiddenRegisterPage
                hasExistingAccounts={members.length > 0}
                onRegisterSuccess={handleAuthSuccess}
              />
            }
          />

          {/* Protected Studio Admin / Team Routes */}
          <Route
            path="/"
            element={
              <Navigate
                to={currentUser ? '/admin/dashboard' : '/login'}
                replace
              />
            }
          />

          <Route
            path="/admin"
            element={
              currentUser ? (
                <AppShell
                  currentUser={currentUser}
                  sessions={sessions}
                  onOpenClientSession={handleOpenClientPreview}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <DashboardPage
                  sessions={sessions}
                  tasks={tasks}
                  schedules={schedules}
                  onOpenClientPreview={handleOpenClientPreview}
                />
              }
            />
            <Route
              path="schedule"
              element={
                <SchedulePage
                  schedules={schedules}
                  sessions={sessions}
                  onRefreshSchedules={refreshSchedules}
                />
              }
            />
            <Route
              path="sessions"
              element={
                <SessionsPage
                  sessions={sessions}
                  onRefreshSessions={refreshSessions}
                  onOpenClientPreview={handleOpenClientPreview}
                />
              }
            />
            <Route
              path="tasks"
              element={
                <TaskManagementPage
                  tasks={tasks}
                  sessions={sessions}
                  onRefreshTasks={refreshTasks}
                />
              }
            />
            <Route
              path="team-manage"
              element={
                currentUser && canManageTeam(currentUser.role) ? (
                  <TeamAdminPage
                    currentUser={currentUser}
                    members={members}
                    onRefreshMembers={refreshMembers}
                  />
                ) : (
                  <Navigate to="/admin/team-directory" replace />
                )
              }
            />
            <Route
              path="team-directory"
              element={
                currentUser ? (
                  <TeamMemberDirectoryPage
                    currentUser={currentUser}
                    members={members}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="profile"
              element={
                currentUser ? (
                  <ProfileAccountPage
                    currentUser={currentUser}
                    onProfileUpdated={(updated) => {
                      setCurrentUser(updated);
                      void refreshMembers();
                    }}
                    onLogout={handleLogout}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="settings"
              element={
                currentUser && canManageTeam(currentUser.role) ? (
                  <SettingsPage />
                ) : (
                  <Navigate to="/admin/dashboard" replace />
                )
              }
            />
          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to={currentUser ? '/admin/dashboard' : '/login'}
                replace
              />
            }
          />
        </Routes>
      )}
    </BrowserRouter>
  );
}
