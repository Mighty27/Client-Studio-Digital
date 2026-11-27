import { useState, type FormEvent } from 'react';
import type { ProofingSession } from '../types/proofing';
import { formatDisplayDate } from '../utils/proofingRules';

interface PinLockScreenProps {
  session: ProofingSession;
  onUnlockSuccess: () => void;
}

export function PinLockScreen({ session, onUnlockSuccess }: PinLockScreenProps) {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerifyPin = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim();
    if (!cleaned) {
      setErrorMessage('Masukkan PIN 4–6 digit yang dikirim oleh studio.');
      return;
    }

    if (cleaned !== session.pin_code) {
      setErrorMessage(
        'PIN akses tidak cocok. Periksa kembali kode PIN dari fotografer Anda.'
      );
      return;
    }

    setErrorMessage(null);
    onUnlockSuccess();
  };

  return (
    <main
      className="container py-5 d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh' }}
    >
      <div
        className="studio-card-elevated p-4 p-md-5 w-100"
        style={{ maxWidth: '440px' }}
      >
        <div className="text-center mb-4">
          <div className="icon-badge icon-badge-lg icon-badge-round icon-badge-primary mx-auto mb-3">
            <i className="bi bi-shield-lock" aria-hidden="true" />
          </div>

          <h1 className="font-editorial fs-2 fw-semibold mb-1 text-light">
            {session.client_name}
          </h1>
          <p className="small text-secondary mb-0">
            Kuota {session.max_quota} foto <span aria-hidden="true">·</span> Aktif s/d{' '}
            {formatDisplayDate(session.expires_at)}
          </p>
        </div>

        <form onSubmit={handleVerifyPin} noValidate>
          <div className="mb-3">
            <label htmlFor="client-pin-input" className="form-label">
              PIN Akses Galeri
            </label>
            <div className="input-group">
              <input
                id="client-pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className={`form-control form-control-lg text-center font-mono-tabular ${
                  errorMessage ? 'is-invalid' : ''
                }`}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                onClick={() => setShowPin((prev) => !prev)}
              >
                <i
                  className={`bi ${showPin ? 'bi-eye-slash' : 'bi-eye'}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {errorMessage && (
              <div className="text-danger small mt-2" role="alert">
                <i className="bi bi-exclamation-circle me-1" aria-hidden="true" />
                {errorMessage}
              </div>
            )}
          </div>

          <div className="d-grid mt-4">
            <button type="submit" className="btn btn-primary btn-lg fs-6 fw-medium">
              <i className="bi bi-unlock me-2" aria-hidden="true" />
              Buka Galeri Foto
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
