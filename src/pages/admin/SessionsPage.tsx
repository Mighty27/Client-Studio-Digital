import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminSessionForm } from '../../components/AdminSessionForm';
import { PageHeader } from '../../components/PageHeader';
import {
  clearPinUnlockedInSession,
  createSession,
  deleteSession,
  listSelectionsBySession,
  removeSelection,
  subscribeToSessionUpdates,
  updateSession,
  updateSessionStatus,
} from '../../services/proofingRepository';
import type {
  FilenameExportFormat,
  PhotoSelection,
  ProofingSession,
  SessionInput,
} from '../../types/proofing';
import {
  buildClientShareUrl,
  calculateQuotaProgress,
  formatDisplayDate,
  formatSelectionFilenames,
  isQuotaReached,
  isSessionExpired,
} from '../../utils/proofingRules';

interface SessionsPageProps {
  sessions: ProofingSession[];
  onRefreshSessions: () => Promise<void>;
  onOpenClientPreview: (sessionId: string) => void;
}

function getStatusLabel(session: ProofingSession): {
  text: string;
  className: string;
} {
  if (isSessionExpired(session.expires_at)) {
    return { text: 'Kedaluwarsa', className: 'text-warning' };
  }
  switch (session.status) {
    case 'submitted':
      return { text: 'Terkirim', className: 'text-success' };
    case 'draft':
      return { text: 'Draf', className: 'text-secondary' };
    default:
      return { text: 'Aktif', className: 'text-primary' };
  }
}

export function SessionsPage({
  sessions,
  onRefreshSessions,
  onOpenClientPreview,
}: SessionsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => searchParams.get('focus') ?? sessions[0]?.id ?? null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSession, setEditingSession] = useState<ProofingSession | null>(null);
  const [prefillClientName, setPrefillClientName] = useState('');
  const [selections, setSelections] = useState<PhotoSelection[]>([]);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const [exportFormat, setExportFormat] = useState<FilenameExportFormat>('comma');
  const [copiedFilenames, setCopiedFilenames] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync focus parameter or ?new=1 from Dashboard / Schedule
  useEffect(() => {
    const focusId = searchParams.get('focus');
    if (focusId && sessions.some((s) => s.id === focusId)) {
      setSelectedSessionId(focusId);
    }
    if (searchParams.get('new') === '1') {
      const clientParam = searchParams.get('client');
      setEditingSession(null);
      if (clientParam) {
        setPrefillClientName(clientParam);
      }
      window.setTimeout(() => {
        const input = document.getElementById('session-client-name');
        input?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        input?.focus();
      }, 60);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      next.delete('client');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, sessions]);

  const activeSession = useMemo(
    () =>
      sessions.find((item) => item.id === selectedSessionId) ??
      sessions[0] ??
      null,
    [sessions, selectedSessionId]
  );

  const loadSelections = useCallback(async () => {
    if (!activeSession) {
      setSelections([]);
      return;
    }
    setLoadingSelections(true);
    try {
      const items = await listSelectionsBySession(activeSession.id);
      setSelections(items);
    } finally {
      setLoadingSelections(false);
    }
  }, [activeSession]);

  useEffect(() => {
    void loadSelections();
  }, [loadSelections]);

  useEffect(() => {
    if (!activeSession) return;
    return subscribeToSessionUpdates(activeSession.id, () => {
      void loadSelections();
      void onRefreshSessions();
    });
  }, [activeSession, loadSelections, onRefreshSessions]);

  const filteredSessions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.client_name.toLowerCase().includes(q));
  }, [sessions, searchTerm]);

  const formattedFilenames = useMemo(
    () => formatSelectionFilenames(selections, exportFormat),
    [selections, exportFormat]
  );

  const handleSaveSession = async (input: SessionInput, editingId?: string) => {
    if (editingId) {
      const updated = await updateSession(editingId, input);
      setEditingSession(null);
      await onRefreshSessions();
      setSelectedSessionId(updated.id);
    } else {
      const created = await createSession(input);
      setPrefillClientName('');
      await onRefreshSessions();
      setSelectedSessionId(created.id);
    }
  };

  const handleCopyClientLink = async (sessionId: string) => {
    const shareUrl = buildClientShareUrl(window.location.origin, sessionId);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard fallback ignored
    }
    setCopiedLinkId(sessionId);
    window.setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleCopyFilenames = async () => {
    if (!formattedFilenames) return;
    try {
      await navigator.clipboard.writeText(formattedFilenames);
    } catch {
      // Clipboard fallback ignored
    }
    setCopiedFilenames(true);
    window.setTimeout(() => setCopiedFilenames(false), 2000);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    setConfirmDeleteId(null);
    if (editingSession?.id === sessionId) {
      setEditingSession(null);
    }
    await onRefreshSessions();
  };

  const handleReopenSession = async (sessionId: string) => {
    await updateSessionStatus(sessionId, 'active');
    await onRefreshSessions();
  };

  const handleAdminRemoveSelection = async (fileId: string) => {
    if (!activeSession) return;
    await removeSelection(activeSession.id, fileId);
    setSelections((prev) => prev.filter((item) => item.file_id !== fileId));
  };

  const quotaPercent = activeSession
    ? calculateQuotaProgress(selections.length, activeSession.max_quota)
    : 0;
  const quotaDone = activeSession
    ? isQuotaReached(selections.length, activeSession.max_quota)
    : false;

  return (
    <div>
      <PageHeader
        title="Sesi Klien"
        subtitle="Kelola daftar sesi galeri Google Drive, PIN akses, kuota paket, dan salin nama file terpilih."
        actions={
          <button
            type="button"
            className="btn btn-sm btn-primary text-nowrap"
            onClick={() => {
              setEditingSession(null);
              const input = document.getElementById('session-client-name');
              input?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              input?.focus();
            }}
          >
            <i className="bi bi-plus-lg me-1.5" aria-hidden="true" />
            Sesi Baru
          </button>
        }
      />

      <div className="row g-4 align-items-start">
        {/* Left Column: Search + Session List + Create/Edit Form */}
        <div className="col-12 col-lg-5 d-flex flex-column gap-4">
          <section className="studio-card p-3 p-md-4" aria-labelledby="sessions-list-title">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 id="sessions-list-title" className="h6 fw-semibold mb-0 text-light">
                Daftar Sesi ({sessions.length})
              </h2>
            </div>

            <div className="mb-3">
              <label htmlFor="admin-session-search" className="visually-hidden">
                Cari nama klien
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-secondary-subtle text-secondary">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="admin-session-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari nama klien atau sesi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="soft-panel text-center py-4 small text-secondary">
                {sessions.length === 0
                  ? 'Belum ada sesi klien. Buat sesi pertama menggunakan form di bawah.'
                  : 'Tidak ada sesi yang cocok dengan pencarian Anda.'}
              </div>
            ) : (
              <div className="d-flex flex-column gap-2" role="list">
                {filteredSessions.map((item) => {
                  const statusInfo = getStatusLabel(item);
                  const isSelected = activeSession?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      className={`session-row-btn ${isSelected ? 'is-active' : ''}`}
                    >
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-start text-decoration-none text-light fw-semibold flex-grow-1"
                          onClick={() => setSelectedSessionId(item.id)}
                        >
                          {item.client_name}
                        </button>
                        <span
                          className={`small fw-medium text-nowrap ${statusInfo.className}`}
                        >
                          {statusInfo.text}
                        </span>
                      </div>

                      <div className="small text-secondary mt-1 d-flex flex-wrap align-items-center gap-1.5">
                        <span className="font-mono-tabular">
                          Kuota {item.max_quota}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">PIN {item.pin_code}</span>
                        <span aria-hidden="true">·</span>
                        <span>Batas {formatDisplayDate(item.expires_at)}</span>
                      </div>

                      <div className="d-flex flex-wrap align-items-center gap-2 mt-2.5">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                          onClick={() => void handleCopyClientLink(item.id)}
                        >
                          <i
                            className={`bi ${
                              copiedLinkId === item.id
                                ? 'bi-check2 text-success'
                                : 'bi-link-45deg'
                            } me-1`}
                            aria-hidden="true"
                          />
                          {copiedLinkId === item.id ? 'Tersalin' : 'Salin Link'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                          onClick={() => {
                            setSelectedSessionId(item.id);
                            setEditingSession(item);
                          }}
                        >
                          <i className="bi bi-pencil me-1" aria-hidden="true" />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap"
                          onClick={() => {
                            clearPinUnlockedInSession(item.id);
                            onOpenClientPreview(item.id);
                          }}
                        >
                          <i className="bi bi-eye me-1" aria-hidden="true" />
                          Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <AdminSessionForm
            editingSession={editingSession}
            prefillClientName={prefillClientName}
            onSave={handleSaveSession}
            onCancelEdit={() => setEditingSession(null)}
          />
        </div>

        {/* Right Column: Selected Session Monitoring & Filename Copy */}
        <div className="col-12 col-lg-7">
          {!activeSession ? (
            <div className="studio-card p-5 text-center">
              <div className="icon-badge icon-badge-lg icon-badge-round icon-badge-muted mx-auto mb-3">
                <i className="bi bi-collection" aria-hidden="true" />
              </div>
              <h2 className="h6 text-light mb-1">Belum Ada Sesi Terpilih</h2>
              <p className="small text-secondary mb-0">
                Buat sesi klien baru di kolom kiri untuk mulai memantau pilihan foto.
              </p>
            </div>
          ) : (
            <section
              className="studio-card p-3 p-md-4 d-flex flex-column gap-4"
              aria-labelledby="monitoring-session-title"
            >
              {/* Header Info */}
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 pb-3 border-bottom border-secondary-subtle">
                <div>
                  <div className="small text-secondary mb-1">
                    Monitoring Sesi <span aria-hidden="true">·</span>{' '}
                    <span className={getStatusLabel(activeSession).className}>
                      {getStatusLabel(activeSession).text}
                    </span>
                  </div>
                  <h2
                    id="monitoring-session-title"
                    className="font-editorial fs-2 fw-semibold text-light mb-1"
                  >
                    {activeSession.client_name}
                  </h2>
                  <div className="small text-secondary d-flex flex-wrap gap-2">
                    <span>
                      Folder ID:{' '}
                      <code className="font-mono-tabular text-light">
                        {activeSession.drive_folder_id}
                      </code>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      PIN:{' '}
                      <code className="font-mono-tabular text-light">
                        {activeSession.pin_code}
                      </code>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Batas: {formatDisplayDate(activeSession.expires_at)}</span>
                  </div>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary text-nowrap"
                    onClick={() => void handleCopyClientLink(activeSession.id)}
                  >
                    <i
                      className={`bi ${
                        copiedLinkId === activeSession.id ? 'bi-check2' : 'bi-link-45deg'
                      } me-1`}
                      aria-hidden="true"
                    />
                    {copiedLinkId === activeSession.id
                      ? 'Link Disalin!'
                      : 'Salin Link Klien'}
                  </button>

                  {activeSession.status === 'submitted' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary text-nowrap"
                      onClick={() => void handleReopenSession(activeSession.id)}
                    >
                      <i className="bi bi-unlock me-1" aria-hidden="true" />
                      Buka Kembali Seleksi
                    </button>
                  )}

                  {confirmDeleteId === activeSession.id ? (
                    <div className="d-inline-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-danger text-nowrap"
                        onClick={() => void handleDeleteSession(activeSession.id)}
                      >
                        Konfirmasi Hapus
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary text-nowrap"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger text-nowrap"
                      aria-label={`Hapus sesi ${activeSession.client_name}`}
                      onClick={() => setConfirmDeleteId(activeSession.id)}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* Link Akses & Progress Bar */}
              <div className="row g-3 align-items-center">
                <div className="col-md-6">
                  <div className="small text-secondary mb-1">Link Akses Klien</div>
                  <div className="mono-box text-truncate">
                    ?session={activeSession.id}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex justify-content-between small mb-1.5">
                    <span className="text-secondary">Progres Seleksi Klien</span>
                    <span className="font-mono-tabular fw-semibold text-light">
                      {selections.length} / {activeSession.max_quota} Foto
                    </span>
                  </div>
                  <div
                    className="studio-progress"
                    role="progressbar"
                    aria-valuenow={quotaPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progres seleksi foto klien"
                  >
                    <div
                      className={`studio-progress-fill ${quotaDone ? 'is-complete' : ''}`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Ringkasan Nama File Terpilih */}
              <div className="soft-panel">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2.5">
                  <div>
                    <h3 className="h6 fw-semibold text-light mb-0">
                      Ringkasan Nama File Terpilih
                    </h3>
                    <p className="small text-secondary mb-0">
                      Siap ditempel ke pencarian Windows Explorer, Finder, atau Adobe
                      Lightroom.
                    </p>
                  </div>

                  <div
                    className="studio-segmented"
                    role="group"
                    aria-label="Format pemisah nama file"
                  >
                    <button
                      type="button"
                      className={`studio-segmented-btn ${
                        exportFormat === 'comma' ? 'active' : ''
                      }`}
                      onClick={() => setExportFormat('comma')}
                    >
                      Koma (,)
                    </button>
                    <button
                      type="button"
                      className={`studio-segmented-btn ${
                        exportFormat === 'space' ? 'active' : ''
                      }`}
                      onClick={() => setExportFormat('space')}
                    >
                      Spasi (Lightroom)
                    </button>
                    <button
                      type="button"
                      className={`studio-segmented-btn ${
                        exportFormat === 'newline' ? 'active' : ''
                      }`}
                      onClick={() => setExportFormat('newline')}
                    >
                      Baris Baru
                    </button>
                  </div>
                </div>

                <label htmlFor="export-filenames-textarea" className="visually-hidden">
                  Daftar nama file terpilih
                </label>
                <textarea
                  id="export-filenames-textarea"
                  readOnly
                  rows={3}
                  className="form-control font-mono-tabular small mb-2.5"
                  value={formattedFilenames}
                  placeholder="Belum ada foto yang dipilih oleh klien..."
                />

                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="small text-secondary font-mono-tabular">
                    {selections.length} file siap disalin
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm fw-medium text-nowrap ${
                      copiedFilenames ? 'btn-success' : 'btn-primary'
                    }`}
                    disabled={selections.length === 0}
                    onClick={() => void handleCopyFilenames()}
                  >
                    <i
                      className={`bi ${
                        copiedFilenames ? 'bi-clipboard-check' : 'bi-clipboard'
                      } me-1.5`}
                      aria-hidden="true"
                    />
                    {copiedFilenames ? 'Tersalin!' : 'Salin Nama File'}
                  </button>
                </div>
              </div>

              {/* Selected Photos Grid */}
              <div>
                <h3 className="h6 fw-semibold text-light mb-3">
                  Foto Terpilih Klien ({selections.length})
                </h3>

                {loadingSelections ? (
                  <div className="text-secondary small py-3">
                    Memuat daftar foto terpilih...
                  </div>
                ) : selections.length === 0 ? (
                  <div className="soft-panel text-center small text-secondary py-4">
                    Klien belum memilih foto pada sesi ini. Bagikan link{' '}
                    <code className="text-light">?session={activeSession.id}</code> dan
                    PIN <code className="text-light">{activeSession.pin_code}</code>{' '}
                    kepada klien.
                  </div>
                ) : (
                  <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-2.5">
                    {selections.map((item) => (
                      <div key={item.id} className="col">
                        <div className="proof-card is-selected h-100 d-flex flex-column">
                          <div className="proof-card-media">
                            <img
                              src={item.thumbnail_url}
                              alt={item.file_name}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="p-2 d-flex align-items-center justify-content-between gap-1 mt-auto">
                            <span
                              className="font-mono-tabular small text-light text-truncate"
                              title={item.file_name}
                            >
                              {item.file_name}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-secondary p-0"
                              aria-label={`Hapus pilihan ${item.file_name}`}
                              title="Hapus dari daftar pilihan"
                              onClick={() => void handleAdminRemoveSelection(item.file_id)}
                            >
                              <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
