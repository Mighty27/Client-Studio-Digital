import { useEffect, useMemo, useState } from 'react';
import type { DrivePhoto, PhotoSelection, ProofingSession } from '../types/proofing';
import { fetchDrivePhotos } from '../utils/driveParser';
import {
  calculateQuotaProgress,
  canTogglePhotoSelection,
  formatDisplayDate,
  isQuotaReached,
} from '../utils/proofingRules';
import { LightboxModal } from './LightboxModal';

interface ClientGalleryProps {
  session: ProofingSession;
  selections: PhotoSelection[];
  onTogglePhoto: (photo: DrivePhoto) => Promise<void>;
  onSubmitSelections: () => Promise<void>;
  onExitPreview?: () => void;
}

interface PhotoCardProps {
  photo: DrivePhoto;
  isSelected: boolean;
  isLocked: boolean;
  canToggle: boolean;
  isBusy: boolean;
  onZoom: () => void;
  onToggle: () => void;
}

function PhotoCard({
  photo,
  isSelected,
  isLocked,
  canToggle,
  isBusy,
  onZoom,
  onToggle,
}: PhotoCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article
      className={`proof-card h-100 d-flex flex-column ${
        isSelected ? 'is-selected' : ''
      } ${isLocked ? 'is-locked' : ''}`}
      data-testid={`photo-card-${photo.id}`}
    >
      <div className="proof-card-media">
        {imgFailed ? (
          <div className="proof-image-fallback">
            <i className="bi bi-image fs-3" aria-hidden="true" />
            <span className="font-mono-tabular small">{photo.name}</span>
          </div>
        ) : (
          <img
            src={photo.thumbnailLink}
            alt={photo.caption ? `${photo.name} — ${photo.caption}` : photo.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        )}

        <button
          type="button"
          className="proof-zoom-btn"
          aria-label={`Perbesar foto ${photo.name}`}
          title="Lihat resolusi besar"
          onClick={onZoom}
        >
          <i className="bi bi-arrows-fullscreen" aria-hidden="true" />
        </button>

        {isSelected && (
          <span
            className="proof-selected-indicator"
            aria-label="Foto terpilih"
            title="Terpilih"
          >
            <i className="bi bi-check-lg" aria-hidden="true" />
          </span>
        )}

        {!isSelected && isLocked && (
          <span
            className="proof-locked-indicator"
            aria-label="Foto terkunci"
            title="Kuota penuh / terkunci"
          >
            <i className="bi bi-lock-fill" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="p-2 p-sm-2.5 d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 mt-auto">
        <span
          className={`font-mono-tabular small text-truncate ${
            isSelected ? 'text-success fw-semibold' : 'text-light'
          }`}
          title={photo.name}
        >
          {photo.name}
        </span>

        <button
          type="button"
          className={`btn btn-sm text-nowrap ${
            isSelected
              ? 'btn-success'
              : isLocked
                ? 'btn-outline-secondary'
                : 'btn-outline-primary'
          }`}
          disabled={!canToggle || isBusy}
          aria-pressed={isSelected}
          aria-label={
            isSelected
              ? `Batalkan pilihan ${photo.name}`
              : isLocked
                ? `Terkunci ${photo.name}`
                : `Pilih ${photo.name}`
          }
          onClick={onToggle}
        >
          {isSelected ? (
            <>
              <i className="bi bi-check2 me-1" aria-hidden="true" />
              Terpilih
            </>
          ) : isLocked ? (
            <>
              <i className="bi bi-lock me-1" aria-hidden="true" />
              Terkunci
            </>
          ) : (
            'Pilih'
          )}
        </button>
      </div>
    </article>
  );
}

export function ClientGallery({
  session,
  selections,
  onTogglePhoto,
  onSubmitSelections,
  onExitPreview,
}: ClientGalleryProps) {
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [driveMode, setDriveMode] = useState<'google_drive' | 'simulation'>('simulation');
  const [driveWarning, setDriveWarning] = useState<string | undefined>(undefined);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingPhotos(true);
    fetchDrivePhotos(session.drive_folder_id)
      .then((res) => {
        if (!active) return;
        setPhotos(res.photos);
        setDriveMode(res.mode);
        setDriveWarning(res.warning);
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });
    return () => {
      active = false;
    };
  }, [session.drive_folder_id]);

  const selectedIds = useMemo(
    () => new Set(selections.map((item) => item.file_id)),
    [selections]
  );

  const selectedCount = selections.length;
  const quotaReached = isQuotaReached(selectedCount, session.max_quota);
  const progressPercent = calculateQuotaProgress(selectedCount, session.max_quota);
  const isSubmitted = session.status === 'submitted';

  const displayedPhotos = useMemo(() => {
    if (filterMode === 'selected') {
      return photos.filter((p) => selectedIds.has(p.id));
    }
    return photos;
  }, [photos, filterMode, selectedIds]);

  const canToggleById = (photoId: string) =>
    canTogglePhotoSelection({
      selectedCount,
      maxQuota: session.max_quota,
      isCurrentlySelected: selectedIds.has(photoId),
      status: session.status,
      isExpired: false,
    });

  const handleToggle = async (photo: DrivePhoto) => {
    if (!canToggleById(photo.id)) return;
    setBusyPhotoId(photo.id);
    try {
      await onTogglePhoto(photo);
    } finally {
      setBusyPhotoId(null);
    }
  };

  const handleConfirmLock = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitSelections();
      setConfirmSubmit(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section
        className="client-sticky-bar studio-topbar-accent py-2 py-md-2.5"
        aria-label="Status Seleksi Kuota Paket"
      >
        <div className="container-xl">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2">
            <div className="d-flex align-items-center justify-content-between gap-2 min-w-0">
              <div className="min-w-0">
                <div className="d-flex align-items-center gap-2">
                  <span className="icon-badge icon-badge-sm icon-badge-primary d-none d-sm-inline-flex">
                    <i className="bi bi-camera2" aria-hidden="true" />
                  </span>
                  <h1 className="font-editorial fs-5 fs-md-4 fw-semibold mb-0 text-light text-truncate">
                    {session.client_name}
                  </h1>
                  <span className="small text-secondary d-none d-lg-inline text-nowrap">
                    <span aria-hidden="true">·</span> Batas{' '}
                    {formatDisplayDate(session.expires_at)}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span
                    className={`font-mono-tabular small fw-semibold text-nowrap ${
                      quotaReached ? 'text-success' : 'text-primary'
                    }`}
                    data-testid="quota-counter"
                  >
                    Terpilih {selectedCount} / Maksimal {session.max_quota} Foto
                  </span>
                  <div
                    className="studio-progress flex-grow-1 d-none d-sm-block"
                    style={{ minWidth: '80px', maxWidth: '180px' }}
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progres kuota foto terpilih"
                  >
                    <div
                      className={`studio-progress-fill ${
                        quotaReached ? 'is-complete' : ''
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between justify-content-md-end gap-2">
              <div className="studio-segmented" role="group" aria-label="Filter foto">
                <button
                  type="button"
                  className={`studio-segmented-btn ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  Semua ({photos.length})
                </button>
                <button
                  type="button"
                  className={`studio-segmented-btn ${filterMode === 'selected' ? 'active' : ''}`}
                  onClick={() => setFilterMode('selected')}
                >
                  Terpilih ({selectedCount})
                </button>
              </div>

              {isSubmitted ? (
                <span className="btn btn-sm btn-success disabled text-nowrap">
                  <i className="bi bi-lock-fill me-1" aria-hidden="true" />
                  Terkirim
                </span>
              ) : confirmSubmit ? (
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-success text-nowrap fw-medium"
                    disabled={isSubmitting || selectedCount === 0}
                    onClick={handleConfirmLock}
                  >
                    {isSubmitting ? 'Mengirim...' : 'Ya, Kunci'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary text-nowrap"
                    onClick={() => setConfirmSubmit(false)}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary text-nowrap fw-medium"
                  disabled={selectedCount === 0}
                  onClick={() => setConfirmSubmit(true)}
                >
                  <i className="bi bi-send-check me-1" aria-hidden="true" />
                  <span className="d-none d-sm-inline">Kunci & Kirim Pilihan</span>
                  <span className="d-inline d-sm-none">Kirim Pilihan</span>
                </button>
              )}

              {onExitPreview && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary text-nowrap"
                  onClick={onExitPreview}
                >
                  <i className="bi bi-arrow-left me-1" aria-hidden="true" />
                  Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="container-xl py-4">
        {isSubmitted && (
          <div
            className="alert alert-success d-flex align-items-center gap-2 mb-3 py-2.5"
            role="status"
          >
            <i className="bi bi-check-circle-fill fs-5" aria-hidden="true" />
            <div className="small">
              <strong>Pilihan foto telah dikunci dan dikirim ke studio.</strong> Tim
              kami sedang memproses {selectedCount} foto pilihan Anda. Hubungi admin
              bila perlu mengubah daftar pilihan.
            </div>
          </div>
        )}

        {!isSubmitted && quotaReached && (
          <div
            className="alert alert-warning d-flex align-items-center gap-2 mb-3 py-2.5"
            role="alert"
            data-testid="quota-full-banner"
          >
            <i className="bi bi-exclamation-triangle-fill fs-5" aria-hidden="true" />
            <div className="small">
              <strong>Kuota paket penuh ({selectedCount}/{session.max_quota} foto).</strong>{' '}
              Kartu foto lainnya dikunci otomatis. Batalkan salah satu pilihan jika
              ingin mengganti foto, atau klik <strong>Kunci & Kirim Pilihan</strong>.
            </div>
          </div>
        )}

        {(driveMode === 'simulation' || driveWarning) && (
          <div className="soft-panel small text-secondary mb-3 py-2 px-3">
            <i className="bi bi-folder2-open me-1.5" aria-hidden="true" />
            {driveWarning
              ? driveWarning
              : 'Mode Simulasi Aktif: Menampilkan 12 foto contoh studio (API Key Google Drive belum diisi).'}
          </div>
        )}

        {loadingPhotos ? (
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="col">
                <div className="proof-card">
                  <div className="proof-card-media placeholder-glow" aria-hidden="true">
                    <span className="placeholder w-100 h-100 bg-secondary opacity-25" />
                  </div>
                  <div className="p-2.5 d-flex justify-content-between">
                    <span className="placeholder col-5 bg-secondary opacity-25 rounded" />
                    <span className="placeholder col-3 bg-secondary opacity-25 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedPhotos.length === 0 ? (
          <div className="soft-panel p-5 text-center my-3">
            <i className="bi bi-images fs-1 text-secondary mb-2 d-block" aria-hidden="true" />
            <h2 className="h6 text-light mb-1">
              {filterMode === 'selected'
                ? 'Belum Ada Foto yang Dipilih'
                : 'Folder Google Drive Kosong'}
            </h2>
            <p className="small text-secondary mb-3">
              {filterMode === 'selected'
                ? 'Kembali ke tab Semua untuk memilih foto favorit Anda.'
                : 'Pastikan folder Google Drive berisi file JPEG/PNG dan dibagikan untuk publik.'}
            </p>
            {filterMode === 'selected' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setFilterMode('all')}
              >
                Tampilkan Semua Foto
              </button>
            )}
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
            {displayedPhotos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              const canToggle = canToggleById(photo.id);
              const isLocked = !isSelected && !canToggle;
              const fullIndex = photos.findIndex((item) => item.id === photo.id);

              return (
                <div key={photo.id} className="col">
                  <PhotoCard
                    photo={photo}
                    isSelected={isSelected}
                    isLocked={isLocked || (isSubmitted && !isSelected)}
                    canToggle={canToggle}
                    isBusy={busyPhotoId === photo.id}
                    onZoom={() => setLightboxIndex(fullIndex)}
                    onToggle={() => void handleToggle(photo)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <LightboxModal
        photos={photos}
        activeIndex={lightboxIndex}
        selectedIds={selectedIds}
        canTogglePhoto={canToggleById}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(nextIdx) => setLightboxIndex(nextIdx)}
        onToggleSelect={(photo) => void handleToggle(photo)}
      />
    </>
  );
}
