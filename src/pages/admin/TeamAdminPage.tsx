import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MemberProfileModal } from '../../components/MemberProfileModal';
import { PageHeader } from '../../components/PageHeader';
import {
  createTeamMemberByAdmin,
  deleteTeamMember,
  updateTeamMemberByAdmin,
} from '../../services/proofingRepository';
import type { TeamMember, TeamMemberInput, TeamRole } from '../../types/proofing';
import {
  canDeleteTeamMember,
  canEditTeamMember,
  getAssignableRolesForActor,
  getInitials,
  validateTeamMemberInput,
} from '../../utils/proofingRules';

interface TeamAdminPageProps {
  currentUser: TeamMember;
  members: TeamMember[];
  onRefreshMembers: () => Promise<void>;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Anggota',
};

const ROLE_BADGE_CLASS: Record<TeamRole, string> = {
  owner: 'icon-badge-warning',
  admin: 'icon-badge-primary',
  member: 'icon-badge-muted',
};

function createEmptyMemberForm(defaultRole: TeamRole = 'member'): TeamMemberInput {
  return {
    full_name: '',
    email: '',
    role: defaultRole,
    job_title: '',
    phone: '',
    bio: '',
    is_active: true,
    password: '',
  };
}

export function TeamAdminPage({
  currentUser,
  members,
  onRefreshMembers,
}: TeamAdminPageProps) {
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamMemberInput>(() =>
    createEmptyMemberForm('member')
  );
  const [errors, setErrors] = useState<Partial<Record<keyof TeamMemberInput, string>>>(
    {}
  );
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | TeamRole>('all');
  const [viewingProfile, setViewingProfile] = useState<TeamMember | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedRegisterUrl, setCopiedRegisterUrl] = useState(false);

  const assignableRoles = useMemo(
    () => getAssignableRolesForActor(currentUser.role),
    [currentUser.role]
  );

  useEffect(() => {
    if (editingMember) {
      setForm({
        full_name: editingMember.full_name,
        email: editingMember.email,
        role: editingMember.role,
        job_title: editingMember.job_title,
        phone: editingMember.phone,
        bio: editingMember.bio,
        is_active: editingMember.is_active,
        password: '',
      });
      setErrors({});
      setSubmitError('');
      setSubmitSuccess('');
    }
  }, [editingMember]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.job_title.toLowerCase().includes(q)
      );
    });
  }, [members, searchTerm, roleFilter]);

  const totalMembers = members.length;
  const privilegedCount = members.filter(
    (m) => m.role === 'owner' || m.role === 'admin'
  ).length;
  const regularCount = members.filter((m) => m.role === 'member').length;
  const activeCount = members.filter((m) => m.is_active).length;

  const hiddenRegisterUrl = `${window.location.origin}/daftar-akun`;

  const handleCopyHiddenRegisterUrl = async () => {
    try {
      await navigator.clipboard.writeText(hiddenRegisterUrl);
    } catch {
      // Ignore clipboard failure
    }
    setCopiedRegisterUrl(true);
    window.setTimeout(() => setCopiedRegisterUrl(false), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    const isCreating = !editingMember;
    const validation = validateTeamMemberInput(form, isCreating);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      if (editingMember) {
        await updateTeamMemberByAdmin(currentUser, editingMember, form);
        setEditingMember(null);
        setForm(createEmptyMemberForm('member'));
        setSubmitSuccess('Data anggota berhasil diperbarui.');
      } else {
        await createTeamMemberByAdmin(currentUser, form);
        setForm(createEmptyMemberForm('member'));
        setSubmitSuccess('Anggota tim baru berhasil ditambahkan.');
      }
      await onRefreshMembers();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menyimpan data anggota.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (target: TeamMember) => {
    setBusyId(target.id);
    try {
      await deleteTeamMember(currentUser, target);
      setConfirmDeleteId(null);
      if (editingMember?.id === target.id) {
        setEditingMember(null);
        setForm(createEmptyMemberForm('member'));
      }
      await onRefreshMembers();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menghapus anggota.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Manajemen Tim & Hak Akses"
        subtitle="Tambah anggota studio, atur peran Owner/Admin/Anggota, lihat profil lengkap, dan kelola akses akun tim."
        actions={
          <button
            type="button"
            className="btn btn-sm btn-primary text-nowrap"
            onClick={() => {
              setEditingMember(null);
              setForm(createEmptyMemberForm('member'));
              setSubmitError('');
              setSubmitSuccess('');
              const el = document.getElementById('team-full-name-input');
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              el?.focus();
            }}
          >
            <i className="bi bi-person-plus me-1.5" aria-hidden="true" />
            Tambah Anggota
          </button>
        }
      />

      {/* 4 Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-primary">
              <i className="bi bi-people" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Total Anggota</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {totalMembers}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-warning">
              <i className="bi bi-shield-check" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Owner & Admin</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {privilegedCount}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-muted">
              <i className="bi bi-person-badge" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Anggota Reguler</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {regularCount}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-success">
              <i className="bi bi-check2-circle" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Akun Aktif</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {activeCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        {/* Left Column: Add/Edit Form + Hidden Registration URL */}
        <div className="col-12 col-lg-5 d-flex flex-column gap-4">
          <section className="studio-card p-3 p-md-4" aria-labelledby="team-form-title">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 id="team-form-title" className="h6 fw-semibold mb-0 text-light">
                {editingMember ? 'Edit Anggota Tim' : 'Tambah Anggota Tim Baru'}
              </h2>
              {editingMember && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary text-nowrap"
                  onClick={() => {
                    setEditingMember(null);
                    setForm(createEmptyMemberForm('member'));
                    setErrors({});
                  }}
                >
                  Batal Edit
                </button>
              )}
            </div>

            {submitError && (
              <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="alert alert-success py-2 px-3 small mb-3" role="status">
                {submitSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="team-full-name-input" className="form-label">
                  Nama Lengkap
                </label>
                <input
                  id="team-full-name-input"
                  type="text"
                  className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
                  placeholder="Contoh: Bima Sakti"
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
                <label htmlFor="team-email-input" className="form-label">
                  Email Akun
                </label>
                <input
                  id="team-email-input"
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="bima@luminastudio.id"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label htmlFor="team-role-select" className="form-label">
                    Hak Akses
                  </label>
                  <select
                    id="team-role-select"
                    className="form-select"
                    value={form.role}
                    disabled={
                      Boolean(editingMember) &&
                      editingMember?.id === currentUser.id
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        role: e.target.value as TeamRole,
                      }))
                    }
                  >
                    {assignableRoles.map((roleOpt) => (
                      <option key={roleOpt} value={roleOpt}>
                        {roleOpt === 'owner'
                          ? 'Owner (Akses Penuh)'
                          : roleOpt === 'admin'
                            ? 'Admin (Kelola Tim)'
                            : 'Anggota (Direktori)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-sm-6">
                  <label htmlFor="team-status-select" className="form-label">
                    Status Akun
                  </label>
                  <select
                    id="team-status-select"
                    className="form-select"
                    value={form.is_active ? 'active' : 'inactive'}
                    disabled={
                      Boolean(editingMember) &&
                      editingMember?.id === currentUser.id
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        is_active: e.target.value === 'active',
                      }))
                    }
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label htmlFor="team-job-input" className="form-label">
                    Jabatan / Divisi
                  </label>
                  <input
                    id="team-job-input"
                    type="text"
                    className="form-control"
                    placeholder="Photographer / Editor"
                    value={form.job_title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, job_title: e.target.value }))
                    }
                  />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="team-phone-input" className="form-label">
                    No. Telepon / WA
                  </label>
                  <input
                    id="team-phone-input"
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
                <label htmlFor="team-password-input" className="form-label">
                  {editingMember
                    ? 'Reset Kata Sandi (Opsional, Min. 6 Karakter)'
                    : 'Kata Sandi Awal (Min. 6 Karakter)'}
                </label>
                <input
                  id="team-password-input"
                  type="password"
                  autoComplete="new-password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  placeholder={
                    editingMember
                      ? 'Kosongkan jika tidak diubah'
                      : 'Masukkan kata sandi awal'
                  }
                  value={form.password ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
                {errors.password && (
                  <div className="invalid-feedback">{errors.password}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="team-bio-input" className="form-label">
                  Catatan Profil / Bio
                </label>
                <textarea
                  id="team-bio-input"
                  rows={2}
                  className="form-control"
                  placeholder="Spesialisasi lighting, kamera, atau catatan tugas tim..."
                  value={form.bio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                />
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary fw-medium py-2"
                  disabled={isSaving}
                >
                  {isSaving
                    ? 'Menyimpan...'
                    : editingMember
                      ? 'Simpan Perubahan Anggota'
                      : 'Simpan Anggota Baru'}
                </button>
              </div>
            </form>
          </section>

          {/* Hidden Signup Invite Box */}
          <section className="studio-card p-3 p-md-4" aria-labelledby="hidden-signup-info">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="icon-badge icon-badge-sm icon-badge-success">
                <i className="bi bi-link-45deg" aria-hidden="true" />
              </span>
              <h2 id="hidden-signup-info" className="h6 fw-semibold mb-0 text-light">
                Link Pendaftaran Tersembunyi
              </h2>
            </div>
            <p className="small text-secondary mb-2.5">
              Halaman ini tidak ditampilkan di halaman Login. Bagikan tautan khusus ini
              jika ingin anggota baru mendaftar akun sendiri (otomatis sebagai Anggota).
            </p>
            <div className="d-flex gap-2 align-items-center">
              <div className="mono-box text-truncate flex-grow-1">/daftar-akun</div>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary text-nowrap"
                onClick={() => void handleCopyHiddenRegisterUrl()}
              >
                <i
                  className={`bi ${copiedRegisterUrl ? 'bi-check2' : 'bi-clipboard'} me-1`}
                  aria-hidden="true"
                />
                {copiedRegisterUrl ? 'Tersalin' : 'Salin Link'}
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Search, Filter & Member Cards */}
        <div className="col-12 col-lg-7">
          <section className="studio-card p-3 p-md-4" aria-labelledby="team-list-heading">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom border-secondary-subtle">
              <div className="d-flex align-items-center gap-2">
                <h2 id="team-list-heading" className="h6 fw-semibold mb-0 text-light">
                  Daftar Anggota Studio
                </h2>
                <span className="mono-box py-0.5 px-2">{filteredMembers.length}</span>
              </div>

              <div
                className="studio-segmented"
                role="group"
                aria-label="Filter hak akses"
              >
                {(['all', 'owner', 'admin', 'member'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`studio-segmented-btn ${
                      roleFilter === r ? 'active' : ''
                    }`}
                    onClick={() => setRoleFilter(r)}
                  >
                    {r === 'all' ? 'Semua' : ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="admin-team-search" className="visually-hidden">
                Cari anggota tim
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-secondary-subtle text-secondary">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="admin-team-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari nama, email, atau jabatan anggota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="soft-panel text-center py-4 small text-secondary">
                Tidak ada anggota tim yang sesuai dengan pencarian atau filter.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {filteredMembers.map((member) => {
                  const allowEdit = canEditTeamMember(currentUser, member);
                  const allowDelete = canDeleteTeamMember(currentUser, member);
                  const isBusy = busyId === member.id;

                  return (
                    <article
                      key={member.id}
                      className="soft-panel p-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
                    >
                      <div className="d-flex align-items-center gap-3 min-w-0">
                        <span
                          className={`icon-badge icon-badge-md icon-badge-round fw-semibold font-mono-tabular ${
                            ROLE_BADGE_CLASS[member.role]
                          }`}
                        >
                          {getInitials(member.full_name)}
                        </span>
                        <div className="min-w-0">
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="fw-semibold text-light">
                              {member.full_name}
                            </span>
                            <span className="mono-box py-0 px-1.5">
                              {ROLE_LABELS[member.role]}
                            </span>
                            {member.id === currentUser.id && (
                              <span className="small text-primary fw-medium">(Anda)</span>
                            )}
                            {!member.is_active && (
                              <span className="small text-danger fw-medium">
                                Nonaktif
                              </span>
                            )}
                          </div>
                          <div className="small text-secondary text-truncate mt-0.5">
                            {member.job_title || 'Tim Studio'} ·{' '}
                            <span className="font-mono-tabular">{member.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-wrap align-items-center gap-1.5">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                          onClick={() => setViewingProfile(member)}
                        >
                          <i className="bi bi-person-vcard me-1" aria-hidden="true" />
                          Profil
                        </button>

                        {allowEdit && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap"
                            onClick={() => {
                              setEditingMember(member);
                              const el = document.getElementById('team-full-name-input');
                              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }}
                          >
                            <i className="bi bi-pencil me-1" aria-hidden="true" />
                            Edit
                          </button>
                        )}

                        {allowDelete &&
                          (confirmDeleteId === member.id ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger py-1 px-2 text-nowrap"
                                disabled={isBusy}
                                onClick={() => void handleDelete(member)}
                              >
                                Konfirmasi Hapus
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              aria-label={`Hapus anggota ${member.full_name}`}
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteId(member.id)}
                            >
                              <i className="bi bi-trash" aria-hidden="true" />
                            </button>
                          ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <MemberProfileModal
        member={viewingProfile}
        onClose={() => setViewingProfile(null)}
      />
    </div>
  );
}
