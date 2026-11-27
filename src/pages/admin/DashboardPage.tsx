import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import type { ProofingSession, StudioSchedule, StudioTask } from '../../types/proofing';
import {
  daysUntilDate,
  formatDisplayDate,
  getUpcomingDeadlines,
  getUpcomingSchedules,
  isExpiringSoon,
  isSessionExpired,
} from '../../utils/proofingRules';

interface DashboardPageProps {
  sessions: ProofingSession[];
  tasks: StudioTask[];
  schedules: StudioSchedule[];
  onOpenClientPreview: (sessionId: string) => void;
}

function getSessionStatusDisplay(session: ProofingSession): {
  label: string;
  className: string;
} {
  if (isSessionExpired(session.expires_at)) {
    return { label: 'Kedaluwarsa', className: 'text-warning' };
  }
  switch (session.status) {
    case 'submitted':
      return { label: 'Terkirim', className: 'text-success' };
    case 'draft':
      return { label: 'Draf', className: 'text-secondary' };
    default:
      return { label: 'Aktif', className: 'text-primary' };
  }
}

export function DashboardPage({
  sessions,
  tasks,
  schedules,
  onOpenClientPreview,
}: DashboardPageProps) {
  const totalSessions = sessions.length;
  const activeSessionsCount = sessions.filter(
    (s) => s.status === 'active' && !isSessionExpired(s.expires_at)
  ).length;
  const expiringSoonCount = sessions.filter((s) =>
    isExpiringSoon(s.expires_at, s.status)
  ).length;
  const runningTasksCount = tasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress'
  ).length;

  const recentSessions = sessions.slice(0, 6);
  const upcomingDeadlines = getUpcomingDeadlines(sessions, 5);
  const upcomingSchedules = getUpcomingSchedules(schedules, undefined, 4);

  return (
    <div>
      <PageHeader
        title="Dashboard Studio"
        subtitle="Ringkasan sesi seleksi foto klien, jadwal pemotretan, tenggat masa aktif, dan beban kerja studio."
        actions={
          <>
            <Link to="/admin/schedule?new=1" className="btn btn-sm btn-outline-secondary text-nowrap">
              <i className="bi bi-calendar-plus me-1.5" aria-hidden="true" />
              Jadwal Baru
            </Link>
            <Link to="/admin/tasks" className="btn btn-sm btn-outline-secondary text-nowrap">
              <i className="bi bi-kanban me-1.5" aria-hidden="true" />
              Kelola Tugas
            </Link>
            <Link
              to="/admin/sessions?new=1"
              className="btn btn-sm btn-primary text-nowrap"
            >
              <i className="bi bi-plus-lg me-1.5" aria-hidden="true" />
              Sesi Baru
            </Link>
          </>
        }
      />

      {/* 4 Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 p-md-4 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-primary">
              <i className="bi bi-collection" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="small text-secondary text-truncate">Total Sesi</div>
              <div className="fs-3 fw-semibold font-mono-tabular text-light">
                {totalSessions}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 p-md-4 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-success">
              <i className="bi bi-check2-circle" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="small text-secondary text-truncate">Sesi Aktif</div>
              <div className="fs-3 fw-semibold font-mono-tabular text-light">
                {activeSessionsCount}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 p-md-4 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-warning">
              <i className="bi bi-hourglass-split" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="small text-secondary lh-sm">
                Mendekati Batas (≤7 Hari)
              </div>
              <div className="fs-3 fw-semibold font-mono-tabular text-light">
                {expiringSoonCount}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="studio-card p-3 p-md-4 h-100 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-primary">
              <i className="bi bi-list-task" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="small text-secondary text-truncate">Tugas Berjalan</div>
              <div className="fs-3 fw-semibold font-mono-tabular text-light">
                {runningTasksCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Sesi Terbaru + Tenggat Terdekat */}
      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-7">
          <section className="studio-card p-3 p-md-4" aria-labelledby="recent-sessions-title">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 id="recent-sessions-title" className="h6 fw-semibold mb-0 text-light">
                Sesi Terbaru
              </h2>
              <Link
                to="/admin/sessions"
                className="small text-primary text-decoration-none text-nowrap"
              >
                Lihat Semua <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="soft-panel text-center py-4">
                <p className="small text-secondary mb-3">
                  Belum ada sesi galeri klien yang dibuat.
                </p>
                <Link to="/admin/sessions?new=1" className="btn btn-sm btn-primary">
                  <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                  Buat Sesi Pertama
                </Link>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {recentSessions.map((session) => {
                  const statusInfo = getSessionStatusDisplay(session);
                  return (
                    <div
                      key={session.id}
                      className="soft-panel py-2.5 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold text-light text-truncate">
                            {session.client_name}
                          </span>
                          <span className={`small fw-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="small text-secondary font-mono-tabular mt-0.5">
                          Kuota {session.max_quota} <span aria-hidden="true">·</span> PIN{' '}
                          {session.pin_code} <span aria-hidden="true">·</span> Batas{' '}
                          {formatDisplayDate(session.expires_at)}
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <Link
                          to={`/admin/sessions?focus=${encodeURIComponent(session.id)}`}
                          className="btn btn-sm btn-outline-secondary text-nowrap"
                        >
                          Kelola
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary text-nowrap"
                          onClick={() => onOpenClientPreview(session.id)}
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="col-12 col-lg-5">
          <section className="studio-card p-3 p-md-4" aria-labelledby="upcoming-deadlines-title">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 id="upcoming-deadlines-title" className="h6 fw-semibold mb-0 text-light">
                Tenggat Terdekat
              </h2>
              <span className="small text-secondary">5 Sesi Aktif</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="soft-panel text-center py-4 small text-secondary">
                Tidak ada sesi aktif yang memiliki tenggat saat ini.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {upcomingDeadlines.map((session) => {
                  const diff = daysUntilDate(session.expires_at);
                  const isOverdue = diff !== null && diff < 0;
                  const isSoon = diff !== null && diff >= 0 && diff <= 7;

                  const borderClass = isOverdue
                    ? 'border-danger'
                    : isSoon
                      ? 'border-warning'
                      : '';
                  const dateTextClass = isOverdue
                    ? 'text-danger'
                    : isSoon
                      ? 'text-warning'
                      : 'text-secondary';

                  const relativeLabel =
                    diff === null
                      ? ''
                      : diff < 0
                        ? `Lewat ${Math.abs(diff)} hari`
                        : diff === 0
                          ? 'Berakhir hari ini'
                          : `${diff} hari lagi`;

                  return (
                    <div
                      key={session.id}
                      className={`soft-panel py-2.5 px-3 d-flex align-items-center justify-content-between gap-2 ${borderClass}`}
                    >
                      <div className="min-w-0">
                        <div className="fw-medium text-light text-truncate">
                          {session.client_name}
                        </div>
                        <div className={`small font-mono-tabular ${dateTextClass}`}>
                          {formatDisplayDate(session.expires_at)}
                          {relativeLabel ? ` · ${relativeLabel}` : ''}
                        </div>
                      </div>
                      <Link
                        to={`/admin/sessions?focus=${encodeURIComponent(session.id)}`}
                        className="btn btn-sm btn-outline-secondary text-nowrap"
                        aria-label={`Buka sesi ${session.client_name}`}
                      >
                        Detail
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Upcoming Shooting Schedule Strip */}
      <section
        className="studio-card p-3 p-md-4 mt-4"
        aria-labelledby="upcoming-shoots-title"
      >
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h2 id="upcoming-shoots-title" className="h6 fw-semibold mb-0 text-light">
            Jadwal Pemotretan Terdekat
          </h2>
          <Link
            to="/admin/schedule"
            className="small text-primary text-decoration-none text-nowrap"
          >
            Buka Kalender <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
          </Link>
        </div>

        {upcomingSchedules.length === 0 ? (
          <div className="soft-panel text-center py-4">
            <p className="small text-secondary mb-3">
              Belum ada jadwal pemotretan mendatang yang tercatat.
            </p>
            <Link to="/admin/schedule?new=1" className="btn btn-sm btn-outline-primary">
              <i className="bi bi-calendar-plus me-1.5" aria-hidden="true" />
              Tambah Jadwal Pemotretan
            </Link>
          </div>
        ) : (
          <div className="row g-3">
            {upcomingSchedules.map((ev) => (
              <div key={ev.id} className="col-12 col-md-6 col-xl-3">
                <div className="soft-panel h-100 d-flex flex-column gap-1.5">
                  <div className="d-flex align-items-center justify-content-between gap-2 small font-mono-tabular text-primary fw-medium">
                    <span className="text-nowrap">{formatDisplayDate(ev.shoot_date)}</span>
                    <span className="text-nowrap">
                      {ev.start_time}–{ev.end_time}
                    </span>
                  </div>
                  <div className="fw-semibold text-light lh-sm">{ev.title}</div>
                  <div className="small text-secondary text-truncate">
                    <i className="bi bi-person me-1" aria-hidden="true" />
                    {ev.client_name}
                  </div>
                  {ev.location && (
                    <div className="small text-secondary text-truncate">
                      <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                      {ev.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
