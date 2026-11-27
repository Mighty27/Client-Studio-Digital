import { useEffect, useState, type FormEvent } from 'react';
import type { ProofingSession, SessionInput, SessionStatus } from '../types/proofing';
import { extractDriveFolderId } from '../utils/driveParser';
import {
  addDaysIsoDate,
  generateRandomPin,
  validateSessionInput,
} from '../utils/proofingRules';

interface AdminSessionFormProps {
  editingSession: ProofingSession | null;
  onSave: (input: SessionInput, editingId?: string) => Promise<void>;
  onCancelEdit: () => void;
}

function createInitialFormState(session: ProofingSession | null): SessionInput {
  if (session) {
    return {
      client_name: session.client_name,
      drive_folder_url: session.drive_folder_url,
      max_quota: session.max_quota,
      pin_code: session.pin_code,
      expires_at: session.expires_at,
      status: session.status,
    };
  }
  return {
    client_name: '',
    drive_folder_url: '',
    max_quota: 30,
    pin_code: generateRandomPin(),
    expires_at: addDaysIsoDate(14),
    status: 'active',
  };
}

export function AdminSessionForm({
  editingSession,
  onSave,
  onCancelEdit,
}: AdminSessionFormProps) {
  const [form, setForm] = useState<SessionInput>(() =>
    createInitialFormState(editingSession)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof SessionInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(createInitialFormState(editingSession));
    setErrors({});
    setSubmitError(null);
  }, [editingSession]);

  const parsedFolderId = extractDriveFolderId(form.drive_folder_url);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateSessionInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await onSave(form, editingSession?.id);
      if (!editingSession) {
        setForm(createInitialFormState(null));
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menyimpan sesi galeri.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="studio-card p-3 p-md-4" aria-labelledby="session-form-heading">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h2 id="session-form-heading" className="h6 fw-semibold mb-0 text-light">
          {editingSession ? 'Edit Sesi Klien' : 'Buat Sesi Klien Baru'}
        </h2>
        {editingSession && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary text-nowrap"
            onClick={onCancelEdit}
          >
            Batal Edit
          </button>
        )}
      </div>

      {submitError && (
        <div className="alert alert-danger py-2 px-3 small" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="session-client-name" className="form-label">
            Nama Klien / Sesi
          </label>
          <input
            id="session-client-name"
            type="text"
            className={`form-control ${errors.client_name ? 'is-invalid' : ''}`}
            placeholder="Contoh: Dito & Clara — Resepsi Jakarta"
            value={form.client_name}
            onChange={(e) => setForm((prev) => ({ ...prev, client_name: e.target.value }))}
          />
          {errors.client_name && (
            <div className="invalid-feedback">{errors.client_name}</div>
          )}
        </div>

        <div className="mb-3">
          <label htmlFor="session-drive-url" className="form-label">
            Link Folder Google Drive (Foto Mentah)
          </label>
          <input
            id="session-drive-url"
            type="url"
            className={`form-control ${errors.drive_folder_url ? 'is-invalid' : ''}`}
            placeholder="https://drive.google.com/drive/folders/1AbCdEf..."
            value={form.drive_folder_url}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, drive_folder_url: e.target.value }))
            }
          />
          {errors.drive_folder_url ? (
            <div className="invalid-feedback">{errors.drive_folder_url}</div>
          ) : (
            <div className="form-text text-secondary small mt-1">
              {parsedFolderId ? (
                <span className="text-success">
                  <i className="bi bi-check-circle me-1" aria-hidden="true" />
                  Folder ID terdeteksi:{' '}
                  <code className="font-mono-tabular text-light">{parsedFolderId}</code>
                </span>
              ) : (
                <span>
                  Tempel tautan share folder Google Drive atau Folder ID langsung.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="row g-3 mb-3">
          <div className="col-sm-6">
            <label htmlFor="session-max-quota" className="form-label">
              Kuota Maksimal Foto
            </label>
            <input
              id="session-max-quota"
              type="number"
              min={1}
              max={2000}
              className={`form-control font-mono-tabular ${errors.max_quota ? 'is-invalid' : ''}`}
              value={form.max_quota}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  max_quota: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
            {errors.max_quota && (
              <div className="invalid-feedback">{errors.max_quota}</div>
            )}
          </div>

          <div className="col-sm-6">
            <label htmlFor="session-pin-code" className="form-label">
              PIN Akses Klien (4–6 Digit)
            </label>
            <div className="input-group">
              <input
                id="session-pin-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={`form-control font-mono-tabular ${errors.pin_code ? 'is-invalid' : ''}`}
                placeholder="1234"
                value={form.pin_code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pin_code: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label="Acak PIN baru"
                title="Acak PIN"
                onClick={() =>
                  setForm((prev) => ({ ...prev, pin_code: generateRandomPin() }))
                }
              >
                <i className="bi bi-shuffle" aria-hidden="true" />
              </button>
              {errors.pin_code && (
                <div className="invalid-feedback">{errors.pin_code}</div>
              )}
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-sm-6">
            <label htmlFor="session-expires-at" className="form-label">
              Masa Aktif (Deadline)
            </label>
            <input
              id="session-expires-at"
              type="date"
              className={`form-control font-mono-tabular ${errors.expires_at ? 'is-invalid' : ''}`}
              value={form.expires_at}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, expires_at: e.target.value }))
              }
            />
            {errors.expires_at && (
              <div className="invalid-feedback">{errors.expires_at}</div>
            )}
          </div>

          <div className="col-sm-6">
            <label htmlFor="session-status" className="form-label">
              Status Sesi
            </label>
            <select
              id="session-status"
              className="form-select"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as SessionStatus,
                }))
              }
            >
              <option value="active">Aktif (Bisa Dipilih)</option>
              <option value="draft">Draf (Persiapan)</option>
              <option value="submitted">Terkirim / Terkunci</option>
            </select>
          </div>
        </div>

        <div className="d-grid">
          <button
            type="submit"
            className="btn btn-primary fw-medium py-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                />
                Menyimpan...
              </>
            ) : editingSession ? (
              <>
                <i className="bi bi-check2-circle me-2" aria-hidden="true" />
                Simpan Perubahan Sesi
              </>
            ) : (
              <>
                <i className="bi bi-plus-lg me-2" aria-hidden="true" />
                Buat Sesi Galeri
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
