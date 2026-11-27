import { useCallback, useEffect, useState } from 'react';
import {
  addSelection,
  getSessionById,
  isPinUnlockedInSession,
  listSelectionsBySession,
  markPinUnlockedInSession,
  removeSelection,
  subscribeToSessionUpdates,
  updateSessionStatus,
} from '../services/proofingRepository';
import type { DrivePhoto, PhotoSelection, ProofingSession } from '../types/proofing';
import { isSessionExpired } from '../utils/proofingRules';
import { ClientGallery } from './ClientGallery';
import { ExpiredLockScreen } from './ExpiredLockScreen';
import { PinLockScreen } from './PinLockScreen';

interface ClientViewProps {
  sessionId: string;
  onExitPreview?: () => void;
}

export function ClientView({ sessionId, onExitPreview }: ClientViewProps) {
  const [session, setSession] = useState<ProofingSession | null>(null);
  const [selections, setSelections] = useState<PhotoSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const loadSessionData = useCallback(async () => {
    setLoading(true);
    try {
      const found = await getSessionById(sessionId);
      setSession(found);
      if (found) {
        const items = await listSelectionsBySession(found.id);
        setSelections(items);
        setIsUnlocked(isPinUnlockedInSession(found.id));
      } else {
        setSelections([]);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSessionData();
  }, [loadSessionData]);

  useEffect(() => {
    return subscribeToSessionUpdates(sessionId, () => {
      void loadSessionData();
    });
  }, [sessionId, loadSessionData]);

  const handleTogglePhoto = async (photo: DrivePhoto) => {
    if (!session) return;
    const exists = selections.some((item) => item.file_id === photo.id);

    if (exists) {
      await removeSelection(session.id, photo.id);
      setSelections((prev) => prev.filter((item) => item.file_id !== photo.id));
    } else {
      if (selections.length >= session.max_quota) {
        return;
      }
      const created = await addSelection(session.id, photo);
      setSelections((prev) => [...prev, created]);
    }
  };

  const handleSubmitSelections = async () => {
    if (!session) return;
    const updated = await updateSessionStatus(session.id, 'submitted');
    setSession(updated);
  };

  if (loading) {
    return (
      <main
        className="container py-5 d-flex flex-column align-items-center justify-content-center text-secondary"
        style={{ minHeight: '100vh' }}
      >
        <div className="spinner-border text-primary mb-2" role="status" />
        <p className="small mb-0">Memuat galeri sesi...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main
        className="container py-5 d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh' }}
      >
        <div className="studio-card-elevated p-4 p-md-5 text-center" style={{ maxWidth: '460px' }}>
          <div className="icon-badge icon-badge-lg icon-badge-round icon-badge-muted mx-auto mb-3">
            <i className="bi bi-folder-x" aria-hidden="true" />
          </div>
          <h1 className="h5 text-light mb-2">Sesi Galeri Tidak Ditemukan</h1>
          <p className="small text-secondary mb-4">
            Link galeri yang Anda buka tidak valid atau sesi sudah dihapus oleh studio.
          </p>
          {onExitPreview && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onExitPreview}
            >
              Kembali ke Dashboard Admin
            </button>
          )}
        </div>
      </main>
    );
  }

  if (isSessionExpired(session.expires_at)) {
    return <ExpiredLockScreen session={session} />;
  }

  if (!isUnlocked) {
    return (
      <PinLockScreen
        session={session}
        onUnlockSuccess={() => {
          markPinUnlockedInSession(session.id);
          setIsUnlocked(true);
        }}
      />
    );
  }

  return (
    <ClientGallery
      session={session}
      selections={selections}
      onTogglePhoto={handleTogglePhoto}
      onSubmitSelections={handleSubmitSelections}
      onExitPreview={onExitPreview}
    />
  );
}
