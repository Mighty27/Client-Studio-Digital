import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  changeOwnPassword,
  updateOwnProfile,
} from '../../services/proofingRepository';
import type { ProfileUpdateInput, TeamMember, TeamRole } from '../../types/proofing';
import {
  formatDisplayDate,
  getInitials,
  validatePasswordChangeInput,
  validateProfileInput,
} from '../../utils/proofingRules';

interface ProfileAccountPageProps {
  currentUser: TeamMember;
  onProfileUpdated: (updatedUser: TeamMember) => void;
  onLogout: () => void;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner Studio',
  admin: 'Admin Studio',
  member: 'Anggota Tim (Akses Direktori)',
};

export function ProfileAccountPage({
  currentUser,
  onProfileUpdated,
  onLogout,
}: ProfileAccountPageProps) {
  const [profileForm, setProfileForm] = useState<ProfileUpdateInput>({
    full_name: currentUser.full_name,
    email: currentUser.email,
    job_title: currentUser.job_title,
    phone: currentUser.phone,
    bio: currentUser.bio,
  });
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileUpdateInput, string>>
  >({});
  const [profileStatus, setProfileStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>
  >({});
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfileForm({
      full_name: currentUser.full_name,
      email: currentUser.email,
      job_title: currentUser.job_title,
      phone: currentUser.phone,
      bio: currentUser.bio,
    });
  }, [currentUser]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);

    const validation = validateProfileInput(profileForm);
    if (!validation.valid) {
      setProfileErrors(validation.errors);
      return;
    }

    setProfileErrors({});
    setSavingProfile(true);
    try {
      const updated = await updateOwnProfile(currentUser.id, profileForm);
      onProfileUpdated(updated);
      setProfileStatus({
        type: 'success',
        message: 'Profil dan email akun Anda berhasil diperbarui.',
      });
    } catch (err) {
      setProfileStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Gagal memperbarui profil Anda.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    const validation = validatePasswordChangeInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.valid) {
      setPasswordErrors(validation.errors);
      return;
    }

    setPasswordErrors({});
    setSavingPassword(true);
    try {
      await changeOwnPassword(currentUser.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({
        type: 'success',
        message: 'Kata sandi akun berhasil diperbarui.',
      });
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Gagal mengganti kata sandi.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Profil & Akun Saya"
        subtitle="Kelola informasi profil pribadi, email login, serta keamanan kata sandi akun studio Anda."
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-danger text-nowrap"
            onClick={onLogout}
          >
            <i className="bi bi-box-arrow-right me-1.5" aria-hidden="true" />
            Keluar Akun
          </button>
        }
      />

      {/* Profile Overview Card */}
      <section className="studio-card p-3 p-md-4 mb-4" aria-label="Ringkasan Akun">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <span className="icon-badge icon-badge-lg icon-badge-round icon-badge-primary fw-semibold font-mono-tabular">
              {getInitials(currentUser.full_name)}
            </span>
            <div className="min-w-0">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <span className="mono-box py-0.5 px-2">
                  {ROLE_LABELS[currentUser.role]}
                </span>
                <span className="small text-success fw-medium">Akun Aktif</span>
              </div>
              <h2 className="font-editorial fs-2 fw-semibold text-light mb-0">
                {currentUser.full_name}
              </h2>
              <div className="small text-secondary font-mono-tabular">
                {currentUser.email} · Bergabung{' '}
                {formatDisplayDate(currentUser.created_at.slice(0, 10))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="row g-4 align-items-start">
        {/* Left: Edit Profile */}
        <div className="col-12 col-lg-6">
          <section className="studio-card p-3 p-md-4" aria-labelledby="edit-profile-title">
            <h2 id="edit-profile-title" className="h6 fw-semibold text-light mb-3">
              Informasi Profil & Kontak
            </h2>

            {profileStatus && (
              <div
                className={`alert py-2 px-3 small mb-3 ${
                  profileStatus.type === 'success' ? 'alert-success' : 'alert-danger'
                }`}
                role="status"
              >
                {profileStatus.message}
              </div>
            )}

            <form onSubmit={handleSaveProfile} noValidate>
              <div className="mb-3">
                <label htmlFor="profile-full-name" className="form-label">
                  Nama Lengkap
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  className={`form-control ${profileErrors.full_name ? 'is-invalid' : ''}`}
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                />
                {profileErrors.full_name && (
                  <div className="invalid-feedback">{profileErrors.full_name}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="profile-email" className="form-label">
                  Email Login
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className={`form-control ${profileErrors.email ? 'is-invalid' : ''}`}
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                {profileErrors.email && (
                  <div className="invalid-feedback">{profileErrors.email}</div>
                )}
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label htmlFor="profile-job-title" className="form-label">
                    Jabatan / Spesialisasi
                  </label>
                  <input
                    id="profile-job-title"
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Lead Photographer"
                    value={profileForm.job_title}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, job_title: e.target.value }))
                    }
                  />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="profile-phone" className="form-label">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    className="form-control font-mono-tabular"
                    placeholder="0812..."
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="profile-bio" className="form-label">
                  Bio / Catatan Profil
                </label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  className="form-control"
                  placeholder="Ceritakan spesialisasi fotografi atau divisi Anda..."
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                />
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary fw-medium py-2"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right: Password Security */}
        <div className="col-12 col-lg-6">
          <section className="studio-card p-3 p-md-4" aria-labelledby="change-password-title">
            <h2 id="change-password-title" className="h6 fw-semibold text-light mb-3">
              Keamanan Akun & Kata Sandi
            </h2>

            {passwordStatus && (
              <div
                className={`alert py-2 px-3 small mb-3 ${
                  passwordStatus.type === 'success' ? 'alert-success' : 'alert-danger'
                }`}
                role="status"
              >
                {passwordStatus.message}
              </div>
            )}

            <form onSubmit={handleChangePassword} noValidate>
              <div className="mb-3">
                <label htmlFor="current-password-input" className="form-label">
                  Kata Sandi Saat Ini
                </label>
                <input
                  id="current-password-input"
                  type="password"
                  autoComplete="current-password"
                  className={`form-control ${
                    passwordErrors.currentPassword ? 'is-invalid' : ''
                  }`}
                  placeholder="Masukkan kata sandi saat ini"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                {passwordErrors.currentPassword && (
                  <div className="invalid-feedback">
                    {passwordErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="new-password-input" className="form-label">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <input
                  id="new-password-input"
                  type="password"
                  autoComplete="new-password"
                  className={`form-control ${
                    passwordErrors.newPassword ? 'is-invalid' : ''
                  }`}
                  placeholder="Masukkan kata sandi baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {passwordErrors.newPassword && (
                  <div className="invalid-feedback">{passwordErrors.newPassword}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="confirm-new-password-input" className="form-label">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  id="confirm-new-password-input"
                  type="password"
                  autoComplete="new-password"
                  className={`form-control ${
                    passwordErrors.confirmPassword ? 'is-invalid' : ''
                  }`}
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {passwordErrors.confirmPassword && (
                  <div className="invalid-feedback">
                    {passwordErrors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-outline-primary fw-medium py-2"
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
