import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { clearPinUnlockedInSession } from '../services/proofingRepository';
import type { ProofingSession, TeamMember, TeamRole } from '../types/proofing';
import { canManageTeam, getInitials } from '../utils/proofingRules';

interface AppShellProps {
  currentUser: TeamMember;
  sessions: ProofingSession[];
  onOpenClientSession: (sessionId: string) => void;
  onLogout: () => void;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Anggota',
};

export function AppShell({
  currentUser,
  sessions,
  onOpenClientSession,
  onLogout,
}: AppShellProps) {
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>('');
  const isPrivileged = canManageTeam(currentUser.role);

  const navItems = useMemo(() => {
    const items = [
      { to: '/admin/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
      { to: '/admin/schedule', label: 'Jadwal Pemotretan', icon: 'bi-calendar3' },
      { to: '/admin/sessions', label: 'Sesi Klien', icon: 'bi-images' },
      { to: '/admin/tasks', label: 'Manajemen Tugas', icon: 'bi-kanban' },
    ];

    if (isPrivileged) {
      items.push({
        to: '/admin/team-manage',
        label: 'Manajemen Tim',
        icon: 'bi-people-fill',
      });
    } else {
      items.push({
        to: '/admin/team-directory',
        label: 'Direktori Tim',
        icon: 'bi-people',
      });
    }

    items.push({
      to: '/admin/profile',
      label: 'Profil & Akun',
      icon: 'bi-person-circle',
    });

    if (isPrivileged) {
      items.push({ to: '/admin/settings', label: 'Pengaturan', icon: 'bi-gear' });
    }

    return items;
  }, [isPrivileged]);

  const effectivePreviewId =
    selectedPreviewId && sessions.some((s) => s.id === selectedPreviewId)
      ? selectedPreviewId
      : sessions[0]?.id ?? '';

  const handleTriggerPreview = (sessionId: string) => {
    if (!sessionId) return;
    clearPinUnlockedInSession(sessionId);
    onOpenClientSession(sessionId);
  };

  const handleMobileNavClick = () => {
    const closeBtn = document.getElementById('adminSidebarOffcanvasClose');
    closeBtn?.click();
  };

  const renderSidebarBody = (closeOffcanvasOnClick = false) => (
    <div className="d-flex flex-column h-100 p-3">
      {/* Brand */}
      <div className="d-flex align-items-center gap-2.5 pb-3 mb-3 studio-topbar-accent">
        <span className="icon-badge icon-badge-md icon-badge-primary">
          <i className="bi bi-camera2" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="fw-semibold text-light text-nowrap">Lumina Proof</div>
          <div className="small text-secondary text-nowrap">
            {ROLE_LABELS[currentUser.role]} Studio
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Navigasi Utama Studio" className="d-flex flex-column gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeOffcanvasOnClick ? handleMobileNavClick : undefined}
            className={({ isActive }) =>
              `studio-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Preview + User Identity */}
      <div className="mt-auto pt-3 border-top border-secondary-subtle d-flex flex-column gap-3">
        <div>
          <label
            htmlFor={
              closeOffcanvasOnClick
                ? 'mobile-sidebar-client-preview'
                : 'desktop-sidebar-client-preview'
            }
            className="form-label small text-secondary mb-2"
          >
            Preview Sebagai Klien
          </label>
          <div className="d-flex flex-column gap-2">
            <select
              id={
                closeOffcanvasOnClick
                  ? 'mobile-sidebar-client-preview'
                  : 'desktop-sidebar-client-preview'
              }
              className="form-select form-select-sm"
              value={effectivePreviewId}
              disabled={sessions.length === 0}
              onChange={(e) => setSelectedPreviewId(e.target.value)}
            >
              {sessions.length === 0 ? (
                <option value="">Belum ada sesi</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.client_name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary w-100 text-nowrap"
              disabled={!effectivePreviewId}
              onClick={() => {
                if (closeOffcanvasOnClick) {
                  handleMobileNavClick();
                }
                handleTriggerPreview(effectivePreviewId);
              }}
            >
              <i className="bi bi-box-arrow-up-right me-1.5" aria-hidden="true" />
              Buka Galeri Klien
            </button>
          </div>
        </div>

        {/* Active User Footer */}
        <div className="soft-panel p-2.5 d-flex align-items-center justify-content-between gap-2">
          <NavLink
            to="/admin/profile"
            onClick={closeOffcanvasOnClick ? handleMobileNavClick : undefined}
            className="d-flex align-items-center gap-2 min-w-0 text-decoration-none"
          >
            <span className="icon-badge icon-badge-sm icon-badge-round icon-badge-primary font-mono-tabular fw-semibold">
              {getInitials(currentUser.full_name)}
            </span>
            <div className="min-w-0">
              <div className="small fw-semibold text-light text-truncate">
                {currentUser.full_name}
              </div>
              <div className="small text-secondary text-truncate" style={{ fontSize: '0.72rem' }}>
                {ROLE_LABELS[currentUser.role]}
              </div>
            </div>
          </NavLink>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-1 px-2"
            title="Keluar akun"
            aria-label="Keluar akun"
            onClick={onLogout}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 d-flex flex-column flex-lg-row">
      {/* Mobile Sticky Topbar with Hamburger */}
      <header className="d-lg-none sticky-top studio-mobile-topbar studio-topbar-accent px-3 py-2.5 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="icon-badge icon-badge-sm icon-badge-primary">
            <i className="bi bi-camera2" aria-hidden="true" />
          </span>
          <span className="fw-semibold text-light">Lumina Proof</span>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-bs-toggle="offcanvas"
          data-bs-target="#adminSidebarOffcanvas"
          aria-controls="adminSidebarOffcanvas"
          aria-label="Buka menu navigasi"
        >
          <i className="bi bi-list fs-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile Offcanvas Sidebar */}
      <div
        className="offcanvas offcanvas-start border-end border-secondary-subtle d-lg-none"
        tabIndex={-1}
        id="adminSidebarOffcanvas"
        aria-labelledby="adminSidebarOffcanvasLabel"
        style={{ backgroundColor: '#101218', color: '#f3f4f6', width: '280px' }}
      >
        <div className="offcanvas-header border-bottom border-secondary-subtle py-2.5">
          <span id="adminSidebarOffcanvasLabel" className="fw-semibold text-light">
            Menu Studio
          </span>
          <button
            id="adminSidebarOffcanvasClose"
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Tutup menu"
          />
        </div>
        <div className="offcanvas-body p-0">{renderSidebarBody(true)}</div>
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="d-none d-lg-block studio-sidebar sticky-top" style={{ height: '100vh' }}>
        {renderSidebarBody(false)}
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow-1 min-w-0 p-3 p-md-4 p-xl-5">
        <div className="container-fluid px-0" style={{ maxWidth: '1320px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
