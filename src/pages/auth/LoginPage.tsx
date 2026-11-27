import { useState, type FormEvent } from 'react';
import {
  authenticateTeamMember,
  registerTeamAccount,
  setStoredAuthUserId,
} from '../../services/proofingRepository';
import type { RegisterAccountInput, TeamMember } from '../../types/proofing';
import { validateRegisterInput } from '../../utils/proofingRules';

interface LoginPageProps {
  hasExistingAccounts: boolean;
  onLoginSuccess: (user: TeamMember) => void;
}

export function LoginPage({ hasExistingAccounts, onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First-run owner claim form states (only active when 0 accounts exist)
  const [setupFullName, setSetupFullName] = useState('');
  const [setupJobTitle, setSetupJobTitle] = useState('Studio Owner');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterAccountInput, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Masukkan email dan kata sandi akun studio Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await authenticateTeamMember(email, password);
      setStoredAuthUserId(user.id);
      onLoginSuccess(user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal masuk ke dashboard studio.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstOwnerSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const input: RegisterAccountInput = {
      full_name: setupFullName,
      email,
      job_title: setupJobTitle,
      phone: setupPhone,
      password,
      confirm_password: setupConfirmPassword,
    };

    const validation = validateRegisterInput(input);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const owner = await registerTeamAccount(input);
      setStoredAuthUserId(owner.id);
      onLoginSuccess(owner);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal membuat akun Owner pertama.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="container py-5 d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh' }}
    >
      <div className="studio-card-elevated p-4 p-md-5 w-100" style={{ maxWidth: '460px' }}>
        <div className="text-center mb-4">
          <div className="icon-badge icon-badge-lg icon-badge-round icon-badge-primary mx-auto mb-3">
            <i
              className={`bi ${hasExistingAccounts ? 'bi-camera2' : 'bi-shield-plus'}`}
              aria-hidden="true"
            />
          </div>
          <h1 className="font-editorial fs-2 fw-semibold text-light mb-1">
            {hasExistingAccounts
              ? 'Lumina Proof Studio'
              : 'Aktivasi Akun Owner Studio'}
          </h1>
          <p className="small text-secondary mb-0">
            {hasExistingAccounts
              ? 'Masuk menggunakan akun tim untuk mengelola sesi, jadwal, dan galeri klien.'
              : 'Belum ada akun terdaftar. Buat akun Owner pertama untuk mengamankan akses studio.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
            <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
            {error}
          </div>
        )}

        {hasExistingAccounts ? (
          <form onSubmit={handleLoginSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">
                Email Akun
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                className="form-control"
                placeholder="nama@studio.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label">
                Kata Sandi
              </label>
              <div className="input-group">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="form-control"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  aria-label={
                    showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <i
                    className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn btn-primary fw-medium py-2.5"
                disabled={submitting}
              >
                <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
                {submitting ? 'Memverifikasi...' : 'Masuk ke Studio'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFirstOwnerSetup} noValidate>
            <div className="mb-3">
              <label htmlFor="owner-setup-name" className="form-label">
                Nama Lengkap Owner
              </label>
              <input
                id="owner-setup-name"
                type="text"
                autoFocus
                className={`form-control ${fieldErrors.full_name ? 'is-invalid' : ''}`}
                placeholder="Contoh: Rafi Pratama"
                value={setupFullName}
                onChange={(e) => setSetupFullName(e.target.value)}
              />
              {fieldErrors.full_name && (
                <div className="invalid-feedback">{fieldErrors.full_name}</div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="owner-setup-email" className="form-label">
                Email Login
              </label>
              <input
                id="owner-setup-email"
                type="email"
                className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                placeholder="owner@luminastudio.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && (
                <div className="invalid-feedback">{fieldErrors.email}</div>
              )}
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label htmlFor="owner-setup-job" className="form-label">
                  Jabatan
                </label>
                <input
                  id="owner-setup-job"
                  type="text"
                  className="form-control"
                  value={setupJobTitle}
                  onChange={(e) => setSetupJobTitle(e.target.value)}
                />
              </div>
              <div className="col-6">
                <label htmlFor="owner-setup-phone" className="form-label">
                  No. WhatsApp
                </label>
                <input
                  id="owner-setup-phone"
                  type="tel"
                  className="form-control font-mono-tabular"
                  placeholder="0812..."
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="owner-setup-password" className="form-label">
                Kata Sandi (Min. 6 Karakter)
              </label>
              <div className="input-group">
                <input
                  id="owner-setup-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                  placeholder="Buat kata sandi kuat"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  aria-label={
                    showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <i
                    className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                    aria-hidden="true"
                  />
                </button>
                {fieldErrors.password && (
                  <div className="invalid-feedback">{fieldErrors.password}</div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="owner-setup-confirm" className="form-label">
                Konfirmasi Kata Sandi
              </label>
              <input
                id="owner-setup-confirm"
                type={showPassword ? 'text' : 'password'}
                className={`form-control ${
                  fieldErrors.confirm_password ? 'is-invalid' : ''
                }`}
                placeholder="Ulangi kata sandi"
                value={setupConfirmPassword}
                onChange={(e) => setSetupConfirmPassword(e.target.value)}
              />
              {fieldErrors.confirm_password && (
                <div className="invalid-feedback">{fieldErrors.confirm_password}</div>
              )}
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn btn-primary fw-medium py-2.5"
                disabled={submitting}
              >
                <i className="bi bi-check2-circle me-2" aria-hidden="true" />
                {submitting ? 'Membuat Akun...' : 'Buat Akun Owner & Masuk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
