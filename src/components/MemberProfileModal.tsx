import { useEffect } from 'react';
import type { TeamMember, TeamRole } from '../types/proofing';
import { formatDisplayDate, getInitials } from '../utils/proofingRules';

interface MemberProfileModalProps {
  member: TeamMember | null;
  onClose: () => void;
}

const ROLE_META: Record<TeamRole, { label: string; badgeClass: string }> = {
  owner: { label: 'Owner', badgeClass: 'icon-badge-warning' },
  admin: { label: 'Admin', badgeClass: 'icon-badge-primary' },
  member: { label: 'Anggota', badgeClass: 'icon-badge-muted' },
};

export function MemberProfileModal({ member, onClose }: MemberProfileModalProps) {
  useEffect(() => {
    if (!member) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const roleMeta = ROLE_META[member.role];
  const joinIso = member.created_at ? member.created_at.slice(0, 10) : null;

  return (
    <div
      className="studio-lightbox-backdrop justify-content-center align-items-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-profile-modal-title"
      onClick={onClose}
    >
      <div
        className="studio-card-elevated p-4 p-md-5 w-100"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <span
              className={`icon-badge icon-badge-lg icon-badge-round fw-semibold font-mono-tabular ${roleMeta.badgeClass}`}
            >
              {getInitials(member.full_name)}
            </span>
            <div className="min-w-0">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <span className="mono-box py-0.5 px-2">{roleMeta.label}</span>
                <span
                  className={`small fw-medium ${
                    member.is_active ? 'text-success' : 'text-danger'
                  }`}
                >
                  {member.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <h2
                id="member-profile-modal-title"
                className="font-editorial fs-2 fw-semibold text-light mb-0 text-truncate"
              >
                {member.full_name}
              </h2>
              <div className="small text-secondary">
                {member.job_title || 'Tim Studio Lumina Proof'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            aria-label="Tutup dialog profil"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="d-flex flex-column gap-2.5 mb-4">
          <div className="soft-panel py-2.5 px-3 d-flex align-items-center justify-content-between gap-2">
            <span className="small text-secondary">Email</span>
            <span className="small font-mono-tabular text-light text-truncate">
              {member.email}
            </span>
          </div>

          <div className="soft-panel py-2.5 px-3 d-flex align-items-center justify-content-between gap-2">
            <span className="small text-secondary">No. Telepon / WhatsApp</span>
            <span className="small font-mono-tabular text-light">
              {member.phone || 'Belum diisi'}
            </span>
          </div>

          <div className="soft-panel py-2.5 px-3 d-flex align-items-center justify-content-between gap-2">
            <span className="small text-secondary">Bergabung Sejak</span>
            <span className="small font-mono-tabular text-light">
              {formatDisplayDate(joinIso)}
            </span>
          </div>

          <div className="soft-panel py-2.5 px-3">
            <div className="small text-secondary mb-1">Bio & Catatan Spesialisasi</div>
            <p className="small text-light mb-0">
              {member.bio || 'Belum ada catatan profil untuk anggota ini.'}
            </p>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-primary px-3"
            onClick={onClose}
          >
            Tutup Profil
          </button>
        </div>
      </div>
    </div>
  );
}
