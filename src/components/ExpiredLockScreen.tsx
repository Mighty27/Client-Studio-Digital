import type { ProofingSession } from '../types/proofing';
import { formatDisplayDate } from '../utils/proofingRules';

interface ExpiredLockScreenProps {
  session: ProofingSession;
}

export function ExpiredLockScreen({ session }: ExpiredLockScreenProps) {
  return (
    <main
      className="container py-5 d-flex align-items-center justify-content-center"
      style={{ minHeight: 'calc(100vh - 70px)' }}
    >
      <div
        className="studio-card p-4 p-md-5 text-center w-100"
        style={{ maxWidth: '480px' }}
        role="region"
        aria-labelledby="expired-lock-heading"
      >
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: '58px',
            height: '58px',
            backgroundColor: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#f59e0b',
          }}
        >
          <i className="bi bi-calendar-x fs-4" aria-hidden="true" />
        </div>

        <h1 id="expired-lock-heading" className="h4 fw-semibold text-light mb-2">
          Masa Aktif Galeri Berakhir
        </h1>
        <p className="font-editorial fs-4 text-secondary mb-3">{session.client_name}</p>
        <p className="small text-secondary mb-0">
          Batas waktu seleksi foto berakhir pada{' '}
          <strong className="text-light font-mono-tabular">
            {formatDisplayDate(session.expires_at)}
          </strong>
          . Galeri ditutup otomatis agar jadwal editing studio tetap berjalan tepat
          waktu. Hubungi admin studio apabila Anda memerlukan perpanjangan akses.
        </p>
      </div>
    </main>
  );
}
