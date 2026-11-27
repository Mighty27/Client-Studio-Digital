import type { AppViewMode, ProofingSession } from '../types/proofing';

interface TopNavbarProps {
  mode: AppViewMode;
  onSwitchMode: (mode: AppViewMode) => void;
  sessions: ProofingSession[];
  activeSessionId: string | null;
  onSelectPreviewSession: (sessionId: string) => void;
}

export function TopNavbar({
  mode,
  onSwitchMode,
  sessions,
  activeSessionId,
  onSelectPreviewSession,
}: TopNavbarProps) {
  return (
    <header className="studio-navbar">
      <div className="container-xl py-2 d-flex align-items-center justify-content-between gap-2 flex-nowrap">
        <a
          href="?"
          onClick={(e) => {
            e.preventDefault();
            onSwitchMode('admin');
          }}
          className="d-inline-flex align-items-center gap-2 text-decoration-none text-light text-nowrap flex-shrink-0"
        >
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-2"
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: 'rgba(59, 130, 246, 0.16)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#3b82f6',
            }}
          >
            <i className="bi bi-camera2" aria-hidden="true" />
          </span>
          <span className="fw-semibold fs-6 tracking-tight">Lumina Proof</span>
        </a>

        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {mode === 'client' && sessions.length > 0 && (
            <div className="d-none d-lg-flex align-items-center gap-2">
              <label
                htmlFor="navbar-preview-session-select"
                className="visually-hidden"
              >
                Pilih Sesi Klien untuk Preview
              </label>
              <select
                id="navbar-preview-session-select"
                className="form-select form-select-sm"
                style={{ maxWidth: '240px' }}
                value={activeSessionId ?? ''}
                onChange={(e) => onSelectPreviewSession(e.target.value)}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.client_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav aria-label="Pengalih Mode Aplikasi" className="studio-segmented">
            <button
              type="button"
              className={`studio-segmented-btn ${mode === 'admin' ? 'active' : ''}`}
              onClick={() => onSwitchMode('admin')}
            >
              <i className="bi bi-sliders2 me-1 d-none d-sm-inline" aria-hidden="true" />
              <span className="d-none d-sm-inline">Dashboard Admin</span>
              <span className="d-inline d-sm-none">Admin</span>
            </button>
            <button
              type="button"
              className={`studio-segmented-btn ${mode === 'client' ? 'active' : ''}`}
              onClick={() => onSwitchMode('client')}
              disabled={sessions.length === 0 && !activeSessionId}
            >
              <i className="bi bi-images me-1 d-none d-sm-inline" aria-hidden="true" />
              <span className="d-none d-sm-inline">Preview Klien</span>
              <span className="d-inline d-sm-none">Klien</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
