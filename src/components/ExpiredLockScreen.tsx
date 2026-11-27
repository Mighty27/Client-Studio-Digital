import type { ProofingSession } from '../types/proofing';
import { formatDisplayDate } from '../utils/proofingRules';

interface ExpiredLockScreenProps {
  session: ProofingSession;
}

export function ExpiredLockScreen({ session }: ExpiredLockScreenProps) {
  return (
    <main
      className="container py-5 d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh' }}
    >
      <div
        className="studio-card-elevated p-4 p-md-5 text-center w-100"
        style={{ maxWidth: '480px' }}
        role="region"
        aria-labelledby="expired-lock-heading"
      >
        <div className="icon-badge icon-badge-lg icon-badge-round icon-badge-warning mx-auto mb-3">
          <i className="bi bi-calendar-x" aria-hidden="true" />
        </div>

        <h1 id="expired-lock-heading" className="h4 fw-semibold text-light mb-2">
          Masa Aktif Galeri Berakhir
        </h1>
        <p className="font-editorial fs-4 text-secondary mb-3">{session.client_name}</p>
        <div className="soft-panel small text-secondary text-start">
          Batas waktu seleksi foto berakhir pada{' '}
          <strong className="text-light font-mono-tabular">
            {formatDisplayDate(session.expires_at)}
          </strong>
          . Galeri ditutup otomatis agar jadwal editing studio tetap berjalan tepat
          waktu. Hubungi admin studio apabila Anda memerlukan perpanjangan akses.
        </div>
      </div>
    </main>
  );
}
