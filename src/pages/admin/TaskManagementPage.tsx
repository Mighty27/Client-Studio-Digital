import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  createTask,
  deleteTask,
  updateTaskStatus,
} from '../../services/proofingRepository';
import type {
  ProofingSession,
  StudioTask,
  TaskInput,
  TaskStatus,
} from '../../types/proofing';
import {
  formatDisplayDate,
  isTaskOverdue,
  validateTaskInput,
} from '../../utils/proofingRules';

interface TaskManagementPageProps {
  tasks: StudioTask[];
  sessions: ProofingSession[];
  onRefreshTasks: () => Promise<void>;
}

const KANBAN_COLUMNS: {
  status: TaskStatus;
  title: string;
  icon: string;
  badgeVariant: string;
}[] = [
  {
    status: 'todo',
    title: 'Perlu Dikerjakan',
    icon: 'bi-circle',
    badgeVariant: 'icon-badge-muted',
  },
  {
    status: 'in_progress',
    title: 'Sedang Dikerjakan',
    icon: 'bi-arrow-repeat',
    badgeVariant: 'icon-badge-primary',
  },
  {
    status: 'done',
    title: 'Selesai',
    icon: 'bi-check2-circle',
    badgeVariant: 'icon-badge-success',
  },
];

export function TaskManagementPage({
  tasks,
  sessions,
  onRefreshTasks,
}: TaskManagementPageProps) {
  const [title, setTitle] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof TaskInput, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const sessionMap = useMemo(() => {
    const map = new Map<string, ProofingSession>();
    for (const s of sessions) {
      map.set(s.id, s);
    }
    return map;
  }, [sessions]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, StudioTask[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of tasks) {
      if (task.status === 'in_progress') {
        grouped.in_progress.push(task);
      } else if (task.status === 'done') {
        grouped.done.push(task);
      } else {
        grouped.todo.push(task);
      }
    }
    return grouped;
  }, [tasks]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const input: TaskInput = {
      title,
      notes,
      session_id: sessionId || null,
      due_date: dueDate || null,
      status: 'todo',
    };

    const validation = validateTaskInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await createTask(input);
      setTitle('');
      setSessionId('');
      setDueDate('');
      setNotes('');
      await onRefreshTasks();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menyimpan tugas baru.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStatus = async (taskId: string, nextStatus: TaskStatus) => {
    setBusyTaskId(taskId);
    try {
      await updateTaskStatus(taskId, nextStatus);
      await onRefreshTasks();
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setBusyTaskId(taskId);
    try {
      await deleteTask(taskId);
      await onRefreshTasks();
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Manajemen Tugas"
        subtitle="Atur antrean penyuntingan, seleksi lanjutan, dan pengiriman hasil foto studio."
      />

      {/* Add Task Form */}
      <section className="studio-card p-3 p-md-4 mb-4" aria-labelledby="add-task-title">
        <h2 id="add-task-title" className="h6 fw-semibold text-light mb-3">
          Tambah Tugas Studio
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12 col-md-5">
              <label htmlFor="task-title-input" className="form-label">
                Judul Tugas
              </label>
              <input
                id="task-title-input"
                type="text"
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                placeholder="Contoh: Color grading 40 foto terpilih"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {errors.title && <div className="invalid-feedback">{errors.title}</div>}
            </div>

            <div className="col-12 col-md-4">
              <label htmlFor="task-session-select" className="form-label">
                Terkait Sesi Klien
              </label>
              <select
                id="task-session-select"
                className="form-select"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Tugas umum studio</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label htmlFor="task-due-date" className="form-label">
                Tenggat (Opsional)
              </label>
              <input
                id="task-due-date"
                type="date"
                className={`form-control font-mono-tabular ${
                  errors.due_date ? 'is-invalid' : ''
                }`}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (errors.due_date) {
                    setErrors((prev) => ({ ...prev, due_date: undefined }));
                  }
                }}
              />
              {errors.due_date && (
                <div className="invalid-feedback">{errors.due_date}</div>
              )}
            </div>

            <div className="col-12">
              <label htmlFor="task-notes-input" className="form-label">
                Catatan Tambahan
              </label>
              <textarea
                id="task-notes-input"
                rows={2}
                className="form-control"
                placeholder="Detail preset, permintaan retouch klien, atau link hasil akhir..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {submitError && (
            <div className="alert alert-danger py-2 mt-3 mb-0 small" role="alert">
              {submitError}
            </div>
          )}

          <div className="d-flex justify-content-end mt-3">
            <button
              type="submit"
              className="btn btn-sm btn-primary text-nowrap"
              disabled={submitting}
            >
              <i className="bi bi-plus-lg me-1.5" aria-hidden="true" />
              {submitting ? 'Menyimpan...' : 'Tambah Tugas'}
            </button>
          </div>
        </form>
      </section>

      {/* 3-Column Kanban Board */}
      <div className="row g-4 align-items-stretch">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasksByColumn[col.status];
          return (
            <div key={col.status} className="col-12 col-lg-4">
              <section
                className="studio-card p-3 h-100 d-flex flex-column"
                aria-labelledby={`kanban-col-${col.status}`}
              >
                <div className="d-flex align-items-center justify-content-between gap-2 pb-2.5 mb-3 border-bottom border-secondary-subtle">
                  <div className="d-flex align-items-center gap-2">
                    <span className={`icon-badge icon-badge-sm ${col.badgeVariant}`}>
                      <i className={`bi ${col.icon}`} aria-hidden="true" />
                    </span>
                    <h3
                      id={`kanban-col-${col.status}`}
                      className="h6 fw-semibold mb-0 text-light"
                    >
                      {col.title}
                    </h3>
                  </div>
                  <span className="mono-box py-0.5 px-2">{columnTasks.length}</span>
                </div>

                {columnTasks.length === 0 ? (
                  <div className="soft-panel text-center py-4 small text-secondary my-auto">
                    Belum ada tugas pada kolom ini.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {columnTasks.map((task) => {
                      const linkedSession = task.session_id
                        ? sessionMap.get(task.session_id)
                        : null;
                      const overdue = isTaskOverdue(task);
                      const isBusy = busyTaskId === task.id;

                      return (
                        <article
                          key={task.id}
                          className={`soft-panel p-3 d-flex flex-column gap-2 ${
                            overdue ? 'border-danger' : ''
                          }`}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <h4 className="h6 fw-semibold text-light mb-0 fs-6">
                              {task.title}
                            </h4>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-secondary p-0"
                              aria-label={`Hapus tugas ${task.title}`}
                              disabled={isBusy}
                              onClick={() => void handleDeleteTask(task.id)}
                            >
                              <i className="bi bi-trash" aria-hidden="true" />
                            </button>
                          </div>

                          <div className="small text-secondary d-flex flex-wrap align-items-center gap-2">
                            <span>
                              <i className="bi bi-person-badge me-1" aria-hidden="true" />
                              {linkedSession
                                ? linkedSession.client_name
                                : 'Tugas umum studio'}
                            </span>
                            {task.due_date && (
                              <span
                                className={`font-mono-tabular ${
                                  overdue ? 'text-danger fw-medium' : 'text-secondary'
                                }`}
                              >
                                <i className="bi bi-calendar-event me-1" aria-hidden="true" />
                                {formatDisplayDate(task.due_date)}
                                {overdue ? ' · Terlambat' : ''}
                              </span>
                            )}
                          </div>

                          {task.notes && (
                            <p className="small text-secondary mb-0">{task.notes}</p>
                          )}

                          <div className="d-flex flex-wrap gap-1.5 pt-2 mt-1 border-top border-secondary-subtle">
                            {task.status === 'todo' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap"
                                disabled={isBusy}
                                onClick={() => void handleMoveStatus(task.id, 'in_progress')}
                              >
                                Mulai Kerjakan
                                <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                              </button>
                            )}

                            {task.status === 'in_progress' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                                  disabled={isBusy}
                                  onClick={() => void handleMoveStatus(task.id, 'todo')}
                                >
                                  <i className="bi bi-arrow-left me-1" aria-hidden="true" />
                                  Mundur
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success py-1 px-2 text-nowrap"
                                  disabled={isBusy}
                                  onClick={() => void handleMoveStatus(task.id, 'done')}
                                >
                                  Tandai Selesai
                                  <i className="bi bi-check2 ms-1" aria-hidden="true" />
                                </button>
                              </>
                            )}

                            {task.status === 'done' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                                disabled={isBusy}
                                onClick={() => void handleMoveStatus(task.id, 'in_progress')}
                              >
                                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                                Buka Ulang
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
