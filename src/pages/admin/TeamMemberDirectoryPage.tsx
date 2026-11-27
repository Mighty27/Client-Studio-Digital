import { useMemo, useState } from 'react';
import { MemberProfileModal } from '../../components/MemberProfileModal';
import { PageHeader } from '../../components/PageHeader';
import type { TeamMember, TeamRole } from '../../types/proofing';
import { getInitials } from '../../utils/proofingRules';

interface TeamMemberDirectoryPageProps {
  currentUser: TeamMember;
  members: TeamMember[];
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

export function TeamMemberDirectoryPage({
  currentUser,
  members,
}: TeamMemberDirectoryPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | TeamRole>('all');
  const [viewingProfile, setViewingProfile] = useState<TeamMember | null>(null);

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

  return (
    <div>
      <PageHeader
        title="Direktori Tim Studio"
        subtitle="Cari rekan tim dan lihat profil lengkap anggota studio Lumina Proof."
      />

      {/* Read-Only Access Notice */}
      <div
        className="soft-panel mb-4 d-flex align-items-center gap-3"
        role="status"
      >
        <span className="icon-badge icon-badge-md icon-badge-muted">
          <i className="bi bi-eye" aria-hidden="true" />
        </span>
        <div>
          <div className="fw-semibold text-light small">
            Mode Akses Terbatas (Anggota)
          </div>
          <div className="small text-secondary">
            Anda masuk sebagai Anggota tanpa hak akses admin. Anda dapat mencari dan
            melihat profil tim, sedangkan penambahan atau penghapusan anggota hanya
            dapat dilakukan oleh Owner atau Admin.
          </div>
        </div>
      </div>

      {/* Search & Role Filter */}
      <section className="studio-card p-3 p-md-4 mb-4" aria-label="Pencarian Anggota Tim">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-7">
            <label htmlFor="directory-search-input" className="visually-hidden">
              Cari nama, jabatan, atau email anggota
            </label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-secondary-subtle text-secondary">
                <i className="bi bi-search" aria-hidden="true" />
              </span>
              <input
                id="directory-search-input"
                type="search"
                className="form-control"
                placeholder="Cari nama, jabatan, atau email anggota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-5 d-flex justify-content-md-end">
            <div
              className="studio-segmented"
              role="group"
              aria-label="Filter peran anggota"
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
        </div>
      </section>

      {/* Member Profile Grid */}
      {filteredMembers.length === 0 ? (
        <div className="studio-card p-5 text-center small text-secondary">
          Tidak ditemukan anggota tim yang cocok dengan kata kunci pencarian Anda.
        </div>
      ) : (
        <div className="row g-3">
          {filteredMembers.map((member) => (
            <div key={member.id} className="col-12 col-md-6 col-xl-4">
              <article className="studio-card p-3 p-md-4 h-100 d-flex flex-column gap-3">
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-3 min-w-0">
                    <span
                      className={`icon-badge icon-badge-md icon-badge-round fw-semibold font-mono-tabular ${
                        ROLE_BADGE_CLASS[member.role]
                      }`}
                    >
                      {getInitials(member.full_name)}
                    </span>
                    <div className="min-w-0">
                      <div className="d-flex align-items-center gap-1.5 min-w-0">
                        <span className="fw-semibold text-light text-truncate">
                          {member.full_name}
                        </span>
                        {member.id === currentUser.id && (
                          <span className="small text-primary fw-medium flex-shrink-0">
                            (Anda)
                          </span>
                        )}
                      </div>
                      <div className="small text-secondary text-truncate">
                        {member.job_title || 'Tim Studio'}
                      </div>
                    </div>
                  </div>
                  <span className="mono-box py-0.5 px-2">
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>

                <div className="soft-panel py-2 px-3 small d-flex flex-column gap-1">
                  <div className="text-secondary text-truncate font-mono-tabular">
                    <i className="bi bi-envelope me-1.5" aria-hidden="true" />
                    {member.email}
                  </div>
                  <div className="text-secondary text-truncate font-mono-tabular">
                    <i className="bi bi-telephone me-1.5" aria-hidden="true" />
                    {member.phone || 'Tidak tercantum'}
                  </div>
                </div>

                <div className="mt-auto d-flex align-items-center justify-content-between gap-2 pt-2 border-top border-secondary-subtle">
                  <span
                    className={`small fw-medium ${
                      member.is_active ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {member.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary text-nowrap"
                    onClick={() => setViewingProfile(member)}
                  >
                    <i className="bi bi-person-vcard me-1.5" aria-hidden="true" />
                    Lihat Profil
                  </button>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}

      <MemberProfileModal
        member={viewingProfile}
        onClose={() => setViewingProfile(null)}
      />
    </div>
  );
}
