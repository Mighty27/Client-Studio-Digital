import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  registerTeamAccount,
  setStoredAuthUserId,
} from '../../services/proofingRepository';
import type { RegisterAccountInput, TeamMember } from '../../types/proofing';
import { validateRegisterInput } from '../../utils/proofingRules';

interface HiddenRegisterPageProps {
  hasExistingAccounts: boolean;
  onRegisterSuccess: (user: TeamMember) => void;
}

export function HiddenRegisterPage({
  hasExistingAccounts,
  onRegisterSuccess,
}: HiddenRegisterPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterAccountInput>({
    full_name: '',
    email: '',
    job_title: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterAccountInput, string>>>(
    {}
  );
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validation = validateRegisterInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const created = await registerTeamAccount(form);
      setStoredAuthUserId(created.id);
      onRegisterSuccess(created);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal mendaftarkan akun baru.'
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
      <div className="studio-card-elevated p-4 p-md-5 w-100" style={{ maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <div className="icon-badge icon-badge-lg icon-badge-round icon-badge-success mx-auto mb-3">
            <i className="bi bi-person-plus" aria-hidden="true" />
          </div>
          <h1 className="font-editorial fs-2 fw-semibold text-light mb-1">
            Registrasi Akun Tim Studio
          </h1>
          <p className="small text-secondary mb-0">
            Halaman pendaftaran internal Lumina Proof.{' '}
            {hasExistingAccounts
              ? 'Akun baru akan dibuat sebagai Anggota (akses baca direktori).'
              : 'Akun pertama otomatis ditetapkan sebagai Owner studio.'}
          </p>
        </div>

        {submitError && (
          <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
            <i className="bi bi-exclamation-circle me-2" aria-hidden="true" />
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="reg-full-name" className="form-label">
              Nama Lengkap
            </label>
            <input
              id="reg-full-name"
              type="text"
              autoFocus
              className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
              placeholder="Contoh: Nadia Putri"
              value={form.full_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
            />
            {errors.full_name && (
              <div className="invalid-feedback">{errors.full_name}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="reg-email" className="form-label">
              Email Akun
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="nadia@luminastudio.id"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>

          <div className="row g-2 mb-3">
            <div className="col-sm-6">
              <label htmlFor="reg-job-title" className="form-label">
                Jabatan / Peran Tim
              </label>
              <input
                id="reg-job-title"
                type="text"
                className="form-control"
                placeholder="Colorist / Editor"
                value={form.job_title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, job_title: e.target.value }))
                }
              />
            </div>
            <div className="col-sm-6">
              <label htmlFor="reg-phone" className="form-label">
                No. Telepon / WA
              </label>
              <input
                id="reg-phone"
                type="tel"
                className="form-control font-mono-tabular"
                placeholder="0812..."
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="reg-password" className="form-label">
              Kata Sandi (Min. 6 Karakter)
            </label>
            <div className="input-group">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
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
              {errors.password && (
                <div className="invalid-feedback">{errors.password}</div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="reg-confirm-password" className="form-label">
              Konfirmasi Kata Sandi
            </label>
            <input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
              placeholder="Ulangi kata sandi"
              value={form.confirm_password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, confirm_password: e.target.value }))
              }
            />
            {errors.confirm_password && (
              <div className="invalid-feedback">{errors.confirm_password}</div>
            )}
          </div>

          <div className="d-grid mb-3">
            <button
              type="submit"
              className="btn btn-primary fw-medium py-2.5"
              disabled={submitting}
            >
              <i className="bi bi-person-check me-2" aria-hidden="true" />
              {submitting ? 'Mendaftarkan Akun...' : 'Daftar & Masuk Studio'}
            </button>
          </div>
        </form>

        <div className="text-center small text-secondary">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-primary text-decoration-none">
            Masuk di sini
          </Link>
        </div>
      </div>
    </main>
  );
}
