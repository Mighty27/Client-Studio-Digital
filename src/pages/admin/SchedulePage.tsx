import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
  updateScheduleStatus,
} from '../../services/proofingRepository';
import type {
  ProofingSession,
  ScheduleEventType,
  ScheduleInput,
  ScheduleStatus,
  StudioSchedule,
} from '../../types/proofing';
import {
  addDaysIsoDate,
  buildMonthCalendarGrid,
  findScheduleConflicts,
  formatDisplayDate,
  getLocalTodayIsoDate,
  validateScheduleInput,
} from '../../utils/proofingRules';

interface SchedulePageProps {
  schedules: StudioSchedule[];
  sessions: ProofingSession[];
  onRefreshSchedules: () => Promise<void>;
}

const EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  wedding: 'Wedding',
  prewedding: 'Prewedding',
  portrait: 'Portrait',
  commercial: 'Komersial',
  event: 'Acara / Event',
  other: 'Lainnya',
};

const STATUS_META: Record<
  ScheduleStatus,
  { label: string; badgeClass: string; textClass: string }
> = {
  scheduled: {
    label: 'Terjadwal',
    badgeClass: 'icon-badge-primary',
    textClass: 'text-primary',
  },
  completed: {
    label: 'Selesai',
    badgeClass: 'icon-badge-success',
    textClass: 'text-success',
  },
  cancelled: {
    label: 'Dibatalkan',
    badgeClass: 'icon-badge-danger',
    textClass: 'text-danger',
  },
};

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function createInitialScheduleForm(
  schedule: StudioSchedule | null,
  defaultDate: string
): ScheduleInput {
  if (schedule) {
    return {
      title: schedule.title,
      client_name: schedule.client_name,
      event_type: schedule.event_type,
      shoot_date: schedule.shoot_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      location: schedule.location,
      photographer: schedule.photographer,
      session_id: schedule.session_id,
      status: schedule.status,
      notes: schedule.notes,
    };
  }
  return {
    title: '',
    client_name: '',
    event_type: 'wedding',
    shoot_date: defaultDate,
    start_time: '09:00',
    end_time: '12:00',
    location: '',
    photographer: '',
    session_id: null,
    status: 'scheduled',
    notes: '',
  };
}

export function SchedulePage({
  schedules,
  sessions,
  onRefreshSchedules,
}: SchedulePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayIso = getLocalTodayIsoDate();

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<'all' | ScheduleStatus>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const initialDateObj = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState<number>(
    initialDateObj.getFullYear()
  );
  const [calendarMonth, setCalendarMonth] = useState<number>(
    initialDateObj.getMonth()
  );

  const [editingSchedule, setEditingSchedule] = useState<StudioSchedule | null>(null);
  const [form, setForm] = useState<ScheduleInput>(() =>
    createInitialScheduleForm(null, addDaysIsoDate(1))
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ScheduleInput, string>>>(
    {}
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingSchedule(null);
      window.setTimeout(() => {
        const el = document.getElementById('schedule-title-input');
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        el?.focus();
      }, 60);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (editingSchedule) {
      setForm(createInitialScheduleForm(editingSchedule, selectedDate));
      setErrors({});
      setSubmitError(null);
    }
  }, [editingSchedule, selectedDate]);

  const sessionMap = useMemo(() => {
    const map = new Map<string, ProofingSession>();
    for (const s of sessions) {
      map.set(s.id, s);
    }
    return map;
  }, [sessions]);

  const filteredSchedules = useMemo(() => {
    if (statusFilter === 'all') return schedules;
    return schedules.filter((item) => item.status === statusFilter);
  }, [schedules, statusFilter]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, StudioSchedule[]>();
    for (const item of filteredSchedules) {
      const existing = map.get(item.shoot_date) ?? [];
      existing.push(item);
      map.set(item.shoot_date, existing);
    }
    return map;
  }, [filteredSchedules]);

  const calendarCells = useMemo(
    () => buildMonthCalendarGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );

  const conflicts = useMemo(
    () =>
      findScheduleConflicts(
        {
          id: editingSchedule?.id,
          shoot_date: form.shoot_date,
          start_time: form.start_time,
          end_time: form.end_time,
          status: form.status,
        },
        schedules
      ),
    [
      editingSchedule?.id,
      form.shoot_date,
      form.start_time,
      form.end_time,
      form.status,
      schedules,
    ]
  );

  const selectedDaySchedules = useMemo(
    () => schedulesByDate.get(selectedDate) ?? [],
    [schedulesByDate, selectedDate]
  );

  const totalScheduledCount = schedules.filter((s) => s.status === 'scheduled').length;
  const upcomingCount = schedules.filter(
    (s) => s.status === 'scheduled' && s.shoot_date >= todayIso
  ).length;
  const completedCount = schedules.filter((s) => s.status === 'completed').length;

  const handleSelectCalendarDay = (isoDate: string) => {
    setSelectedDate(isoDate);
    if (!editingSchedule) {
      setForm((prev) => ({ ...prev, shoot_date: isoDate }));
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setSelectedDate(todayIso);
    if (!editingSchedule) {
      setForm((prev) => ({ ...prev, shoot_date: todayIso }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateScheduleInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      if (editingSchedule) {
        const updated = await updateSchedule(editingSchedule.id, form);
        setEditingSchedule(null);
        setSelectedDate(updated.shoot_date);
      } else {
        const created = await createSchedule(form);
        setSelectedDate(created.shoot_date);
      }
      setForm(createInitialScheduleForm(null, selectedDate));
      await onRefreshSchedules();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menyimpan jadwal pemotretan.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeStatus = async (id: string, status: ScheduleStatus) => {
    setBusyId(id);
    try {
      await updateScheduleStatus(id, status);
      await onRefreshSchedules();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteSchedule(id);
      setConfirmDeleteId(null);
      if (editingSchedule?.id === id) {
        setEditingSchedule(null);
        setForm(createInitialScheduleForm(null, selectedDate));
      }
      await onRefreshSchedules();
    } finally {
      setBusyId(null);
    }
  };

  const renderScheduleItem = (item: StudioSchedule) => {
    const statusMeta = STATUS_META[item.status];
    const linkedSession = item.session_id ? sessionMap.get(item.session_id) : null;
    const isBusy = busyId === item.id;

    return (
      <article
        key={item.id}
        className="soft-panel p-3 d-flex flex-column gap-2"
      >
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div className="min-w-0">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="mono-box py-0.5 px-2">
                {formatDisplayDate(item.shoot_date)} · {item.start_time}–{item.end_time}
              </span>
              <span className="small text-secondary">
                {EVENT_TYPE_LABELS[item.event_type]}
              </span>
              <span className={`small fw-medium ${statusMeta.textClass}`}>
                {statusMeta.label}
              </span>
            </div>
            <h4 className="h6 fw-semibold text-light mb-0">{item.title}</h4>
          </div>

          <div className="d-flex align-items-center gap-1.5">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
              onClick={() => {
                setEditingSchedule(item);
                const el = document.getElementById('schedule-title-input');
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                el?.focus();
              }}
            >
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Edit
            </button>

            {confirmDeleteId === item.id ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-danger py-1 px-2 text-nowrap"
                  disabled={isBusy}
                  onClick={() => void handleDelete(item.id)}
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
                aria-label={`Hapus jadwal ${item.title}`}
                disabled={isBusy}
                onClick={() => setConfirmDeleteId(item.id)}
              >
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="small text-secondary d-flex flex-wrap gap-3">
          <span>
            <i className="bi bi-person me-1" aria-hidden="true" />
            {item.client_name}
          </span>
          {item.location && (
            <span>
              <i className="bi bi-geo-alt me-1" aria-hidden="true" />
              {item.location}
            </span>
          )}
          {item.photographer && (
            <span>
              <i className="bi bi-camera me-1" aria-hidden="true" />
              {item.photographer}
            </span>
          )}
        </div>

        {item.notes && <p className="small text-secondary mb-0">{item.notes}</p>}

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 mt-1 border-top border-secondary-subtle">
          <div className="d-flex flex-wrap gap-1.5">
            {item.status !== 'completed' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success py-1 px-2 text-nowrap"
                disabled={isBusy}
                onClick={() => void handleChangeStatus(item.id, 'completed')}
              >
                <i className="bi bi-check2-circle me-1" aria-hidden="true" />
                Tandai Selesai
              </button>
            )}
            {item.status === 'scheduled' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                disabled={isBusy}
                onClick={() => void handleChangeStatus(item.id, 'cancelled')}
              >
                Batalkan
              </button>
            )}
            {item.status !== 'scheduled' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap"
                disabled={isBusy}
                onClick={() => void handleChangeStatus(item.id, 'scheduled')}
              >
                Jadwalkan Ulang
              </button>
            )}
          </div>

          {linkedSession ? (
            <Link
              to={`/admin/sessions?focus=${encodeURIComponent(linkedSession.id)}`}
              className="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap"
            >
              <i className="bi bi-images me-1" aria-hidden="true" />
              Sesi: {linkedSession.client_name}
            </Link>
          ) : (
            <Link
              to={`/admin/sessions?new=1&client=${encodeURIComponent(item.client_name)}`}
              className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
            >
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Buat Galeri Proofing
            </Link>
          )}
        </div>
      </article>
    );
  };

  return (
    <div>
      <PageHeader
        title="Jadwal Pemotretan"
        subtitle="Kelola kalender event pemotretan, jam sesi, lokasi, penugasan fotografer, serta deteksi bentrok jadwal."
        actions={
          <button
            type="button"
            className="btn btn-sm btn-primary text-nowrap"
            onClick={() => {
              setEditingSchedule(null);
              setForm(createInitialScheduleForm(null, selectedDate));
              const el = document.getElementById('schedule-title-input');
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              el?.focus();
            }}
          >
            <i className="bi bi-plus-lg me-1.5" aria-hidden="true" />
            Jadwal Baru
          </button>
        }
      />

      {/* Summary Strip */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-4">
          <div className="studio-card p-3 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-primary">
              <i className="bi bi-calendar-check" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Event Terjadwal</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {totalScheduledCount}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-4">
          <div className="studio-card p-3 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-warning">
              <i className="bi bi-clock-history" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Akan Datang</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {upcomingCount}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-4">
          <div className="studio-card p-3 d-flex align-items-center gap-3">
            <span className="icon-badge icon-badge-md icon-badge-success">
              <i className="bi bi-check2-all" aria-hidden="true" />
            </span>
            <div>
              <div className="small text-secondary">Sesi Selesai</div>
              <div className="fs-4 fw-semibold font-mono-tabular text-light">
                {completedCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        {/* Left Column: Schedule Form */}
        <div className="col-12 col-lg-5">
          <section className="studio-card p-3 p-md-4" aria-labelledby="schedule-form-heading">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 id="schedule-form-heading" className="h6 fw-semibold mb-0 text-light">
                {editingSchedule ? 'Edit Jadwal Event' : 'Tambah Jadwal Pemotretan'}
              </h2>
              {editingSchedule && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary text-nowrap"
                  onClick={() => {
                    setEditingSchedule(null);
                    setForm(createInitialScheduleForm(null, selectedDate));
                  }}
                >
                  Batal Edit
                </button>
              )}
            </div>

            {conflicts.length > 0 && (
              <div
                className="soft-panel border-warning mb-3 small text-warning d-flex align-items-start gap-2"
                role="status"
              >
                <i className="bi bi-exclamation-triangle mt-0.5" aria-hidden="true" />
                <div>
                  <strong>Peringatan Bentrok Jam:</strong> Rentang waktu bertabrakan
                  dengan{' '}
                  <span className="text-light fw-medium">{conflicts[0].title}</span> (
                  <span className="font-mono-tabular">
                    {conflicts[0].start_time}–{conflicts[0].end_time}
                  </span>
                  ). Pastikan tim fotografer berbeda jika tetap disimpan.
                </div>
              </div>
            )}

            {submitError && (
              <div className="alert alert-danger py-2 px-3 small" role="alert">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="schedule-title-input" className="form-label">
                  Nama Event / Sesi Pemotretan
                </label>
                <input
                  id="schedule-title-input"
                  type="text"
                  className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                  placeholder="Contoh: Akad & Resepsi Dito & Clara"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-7">
                  <label htmlFor="schedule-client-input" className="form-label">
                    Nama Klien
                  </label>
                  <input
                    id="schedule-client-input"
                    type="text"
                    className={`form-control ${errors.client_name ? 'is-invalid' : ''}`}
                    placeholder="Contoh: Dito & Clara"
                    value={form.client_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, client_name: e.target.value }))
                    }
                  />
                  {errors.client_name && (
                    <div className="invalid-feedback">{errors.client_name}</div>
                  )}
                </div>

                <div className="col-sm-5">
                  <label htmlFor="schedule-type-select" className="form-label">
                    Jenis Event
                  </label>
                  <select
                    id="schedule-type-select"
                    className="form-select"
                    value={form.event_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        event_type: e.target.value as ScheduleEventType,
                      }))
                    }
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12">
                  <label htmlFor="schedule-date-input" className="form-label">
                    Tanggal Pemotretan
                  </label>
                  <input
                    id="schedule-date-input"
                    type="date"
                    className={`form-control font-mono-tabular ${
                      errors.shoot_date ? 'is-invalid' : ''
                    }`}
                    value={form.shoot_date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, shoot_date: e.target.value }))
                    }
                  />
                  {errors.shoot_date && (
                    <div className="invalid-feedback">{errors.shoot_date}</div>
                  )}
                </div>

                <div className="col-6">
                  <label htmlFor="schedule-start-input" className="form-label">
                    Jam Mulai
                  </label>
                  <input
                    id="schedule-start-input"
                    type="time"
                    className={`form-control font-mono-tabular ${
                      errors.start_time ? 'is-invalid' : ''
                    }`}
                    value={form.start_time}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, start_time: e.target.value }))
                    }
                  />
                  {errors.start_time && (
                    <div className="invalid-feedback">{errors.start_time}</div>
                  )}
                </div>

                <div className="col-6">
                  <label htmlFor="schedule-end-input" className="form-label">
                    Jam Selesai
                  </label>
                  <input
                    id="schedule-end-input"
                    type="time"
                    className={`form-control font-mono-tabular ${
                      errors.end_time ? 'is-invalid' : ''
                    }`}
                    value={form.end_time}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, end_time: e.target.value }))
                    }
                  />
                  {errors.end_time && (
                    <div className="invalid-feedback">{errors.end_time}</div>
                  )}
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label htmlFor="schedule-location-input" className="form-label">
                    Lokasi Pemotretan
                  </label>
                  <input
                    id="schedule-location-input"
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Studio 1 / Hotel Mulia"
                    value={form.location}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                </div>

                <div className="col-sm-6">
                  <label htmlFor="schedule-photographer-input" className="form-label">
                    Fotografer / Tim
                  </label>
                  <input
                    id="schedule-photographer-input"
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Rafi & Tim B"
                    value={form.photographer}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, photographer: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-7">
                  <label htmlFor="schedule-session-select" className="form-label">
                    Tautkan Sesi Galeri (Opsional)
                  </label>
                  <select
                    id="schedule-session-select"
                    className="form-select"
                    value={form.session_id ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        session_id: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">Belum ditautkan</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-sm-5">
                  <label htmlFor="schedule-status-select" className="form-label">
                    Status
                  </label>
                  <select
                    id="schedule-status-select"
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as ScheduleStatus,
                      }))
                    }
                  >
                    <option value="scheduled">Terjadwal</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="schedule-notes-input" className="form-label">
                  Catatan / Brief Pemotretan
                </label>
                <textarea
                  id="schedule-notes-input"
                  rows={2}
                  className="form-control"
                  placeholder="Perlengkapan lighting, moodboard, atau jadwal call time..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
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
                    : editingSchedule
                      ? 'Simpan Perubahan Jadwal'
                      : 'Simpan Jadwal Event'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Calendar & Agenda List */}
        <div className="col-12 col-lg-7 d-flex flex-column gap-4">
          <section className="studio-card p-3 p-md-4" aria-labelledby="schedule-board-title">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom border-secondary-subtle">
              <div className="d-flex align-items-center gap-2">
                <h2 id="schedule-board-title" className="h6 fw-semibold mb-0 text-light">
                  {viewMode === 'calendar' ? 'Kalender Studio' : 'Daftar Semua Jadwal'}
                </h2>
                <span className="mono-box py-0.5 px-2">{filteredSchedules.length}</span>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                <select
                  aria-label="Filter status jadwal"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | ScheduleStatus)
                  }
                >
                  <option value="all">Semua Status</option>
                  <option value="scheduled">Terjadwal</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>

                <div
                  className="studio-segmented"
                  role="group"
                  aria-label="Mode tampilan jadwal"
                >
                  <button
                    type="button"
                    className={`studio-segmented-btn ${
                      viewMode === 'calendar' ? 'active' : ''
                    }`}
                    onClick={() => setViewMode('calendar')}
                  >
                    <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                    Kalender
                  </button>
                  <button
                    type="button"
                    className={`studio-segmented-btn ${
                      viewMode === 'list' ? 'active' : ''
                    }`}
                    onClick={() => setViewMode('list')}
                  >
                    <i className="bi bi-list-ul me-1" aria-hidden="true" />
                    Daftar
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'calendar' ? (
              <>
                {/* Month Navigation */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      aria-label="Bulan sebelumnya"
                      onClick={handlePrevMonth}
                    >
                      <i className="bi bi-chevron-left" aria-hidden="true" />
                    </button>
                    <span className="fw-semibold text-light px-2">
                      {MONTH_NAMES_ID[calendarMonth]} {calendarYear}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      aria-label="Bulan berikutnya"
                      onClick={handleNextMonth}
                    >
                      <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary text-nowrap"
                    onClick={handleGoToday}
                  >
                    Hari Ini
                  </button>
                </div>

                {/* Weekday Header + Grid */}
                <div className="studio-calendar-grid mb-1">
                  {WEEKDAYS_ID.map((day) => (
                    <div key={day} className="studio-calendar-weekday">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="studio-calendar-grid mb-4">
                  {calendarCells.map((cell) => {
                    const dayItems = schedulesByDate.get(cell.isoDate) ?? [];
                    const isToday = cell.isoDate === todayIso;
                    const isSelected = cell.isoDate === selectedDate;
                    return (
                      <button
                        key={cell.isoDate}
                        type="button"
                        onClick={() => handleSelectCalendarDay(cell.isoDate)}
                        className={`studio-calendar-cell ${
                          cell.inCurrentMonth ? '' : 'is-outside'
                        } ${isToday ? 'is-today' : ''} ${
                          isSelected ? 'is-selected' : ''
                        }`}
                      >
                        <div className="d-flex align-items-center justify-content-between w-100">
                          <span
                            className={`small font-mono-tabular ${
                              isToday ? 'text-success fw-semibold' : 'text-light'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          {dayItems.length > 0 && (
                            <span className="small text-secondary font-mono-tabular">
                              {dayItems.length}
                            </span>
                          )}
                        </div>

                        {dayItems.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className={`studio-calendar-pill w-100 ${
                              ev.status === 'completed'
                                ? 'is-completed'
                                : ev.status === 'cancelled'
                                  ? 'is-cancelled'
                                  : ''
                            }`}
                            title={`${ev.start_time} ${ev.title}`}
                          >
                            {ev.start_time} {ev.title}
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="small text-secondary font-mono-tabular">
                            +{dayItems.length - 2} lagi
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Agenda */}
                <div className="pt-3 border-top border-secondary-subtle">
                  <h3 className="h6 fw-semibold text-light mb-3">
                    Agenda Tanggal {formatDisplayDate(selectedDate)} (
                    {selectedDaySchedules.length})
                  </h3>

                  {selectedDaySchedules.length === 0 ? (
                    <div className="soft-panel text-center py-4 small text-secondary">
                      Belum ada pemotretan terjadwal pada tanggal{' '}
                      <span className="text-light">
                        {formatDisplayDate(selectedDate)}
                      </span>
                      . Isi form di samping untuk menambahkan jadwal pada tanggal ini.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2.5">
                      {selectedDaySchedules.map(renderScheduleItem)}
                    </div>
                  )}
                </div>
              </>
            ) : filteredSchedules.length === 0 ? (
              <div className="soft-panel text-center py-4 small text-secondary">
                Belum ada jadwal pemotretan yang cocok dengan filter saat ini.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {filteredSchedules.map(renderScheduleItem)}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
