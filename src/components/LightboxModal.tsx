import { useEffect, useState } from 'react';
import type { DrivePhoto } from '../types/proofing';

interface LightboxModalProps {
  photos: DrivePhoto[];
  activeIndex: number | null;
  selectedIds: Set<string>;
  canTogglePhoto: (photoId: string) => boolean;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onToggleSelect: (photo: DrivePhoto) => void;
}

export function LightboxModal({
  photos,
  activeIndex,
  selectedIds,
  canTogglePhoto,
  onClose,
  onNavigate,
  onToggleSelect,
}: LightboxModalProps) {
  const [imgError, setImgError] = useState(false);

  const photo = activeIndex !== null ? photos[activeIndex] ?? null : null;

  useEffect(() => {
    setImgError(false);
  }, [activeIndex, photo?.id]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft' && activeIndex > 0) {
        onNavigate(activeIndex - 1);
      } else if (event.key === 'ArrowRight' && activeIndex < photos.length - 1) {
        onNavigate(activeIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, photos.length, onClose, onNavigate]);

  if (activeIndex === null || !photo) {
    return null;
  }

  const isSelected = selectedIds.has(photo.id);
  const toggleAllowed = canTogglePhoto(photo.id);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < photos.length - 1;

  return (
    <div
      className="studio-lightbox-backdrop p-3 p-md-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-photo-name"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="d-flex align-items-center justify-content-between gap-3 pb-3">
        <div className="d-flex align-items-center gap-3 min-w-0">
          <span
            id="lightbox-photo-name"
            className="font-mono-tabular text-light fw-medium text-truncate"
          >
            {photo.name}
          </span>
          <span className="font-mono-tabular small text-secondary text-nowrap">
            {activeIndex + 1} / {photos.length}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm text-nowrap"
          onClick={onClose}
          aria-label="Tutup pratinjau foto"
        >
          <i className="bi bi-x-lg me-1" aria-hidden="true" />
          Tutup
        </button>
      </div>

      <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative min-h-0">
        {hasPrev && (
          <button
            type="button"
            className="btn btn-dark border border-secondary-subtle position-absolute start-0 top-50 translate-middle-y z-2"
            aria-label="Foto sebelumnya"
            onClick={() => onNavigate(activeIndex - 1)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
        )}

        <div className="d-flex align-items-center justify-content-center w-100 h-100 px-5">
          {imgError ? (
            <div
              className="proof-image-fallback rounded-3 border border-secondary-subtle"
              style={{ width: '480px', height: '320px' }}
            >
              <i className="bi bi-image fs-1" aria-hidden="true" />
              <div className="font-mono-tabular small">{photo.name}</div>
              <div className="small text-secondary">
                Pratinjau resolusi penuh tidak dapat dimuat.
              </div>
            </div>
          ) : (
            <img
              src={photo.previewUrl || photo.thumbnailLink}
              alt={photo.caption ? `${photo.name} — ${photo.caption}` : photo.name}
              referrerPolicy="no-referrer"
              className="studio-lightbox-img"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {hasNext && (
          <button
            type="button"
            className="btn btn-dark border border-secondary-subtle position-absolute end-0 top-50 translate-middle-y z-2"
            aria-label="Foto berikutnya"
            onClick={() => onNavigate(activeIndex + 1)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3">
        <div className="small text-secondary">
          {photo.caption ? photo.caption : 'Gunakan tombol panah kiri/kanan untuk navigasi'}
        </div>

        <button
          type="button"
          className={`btn text-nowrap fw-medium ${
            isSelected ? 'btn-success' : 'btn-primary'
          }`}
          disabled={!toggleAllowed}
          onClick={() => onToggleSelect(photo)}
        >
          {isSelected ? (
            <>
              <i className="bi bi-check2-circle me-2" aria-hidden="true" />
              Terpilih (Klik untuk Batalkan)
            </>
          ) : toggleAllowed ? (
            <>
              <i className="bi bi-plus-circle me-2" aria-hidden="true" />
              Pilih Foto Ini
            </>
          ) : (
            <>
              <i className="bi bi-lock me-2" aria-hidden="true" />
              Kuota Penuh / Terkunci
            </>
          )}
        </button>
      </div>
    </div>
  );
}
