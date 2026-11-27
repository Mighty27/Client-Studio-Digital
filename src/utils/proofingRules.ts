import type {
  FilenameExportFormat,
  PhotoSelection,
  SessionInput,
  SessionStatus,
} from '../types/proofing';
import { extractDriveFolderId } from './driveParser';

/**
 * Returns local calendar date formatted as YYYY-MM-DD.
 */
export function getLocalTodayIsoDate(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds N days to reference date and returns YYYY-MM-DD.
 */
export function addDaysIsoDate(days: number, referenceDate: Date = new Date()): string {
  const next = new Date(referenceDate.getTime());
  next.setDate(next.getDate() + days);
  return getLocalTodayIsoDate(next);
}

/**
 * Checks if the gallery expiration date has passed.
 * Active on the deadline date itself; expires once today > expiresAt.
 */
export function isSessionExpired(
  expiresAt: string,
  todayIso: string = getLocalTodayIsoDate()
): boolean {
  if (!expiresAt || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    return false;
  }
  return todayIso > expiresAt;
}

/**
 * Computes quota percentage clamped between 0 and 100.
 */
export function calculateQuotaProgress(selectedCount: number, maxQuota: number): number {
  if (maxQuota <= 0) {
    return 0;
  }
  const ratio = (selectedCount / maxQuota) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

/**
 * True when client has reached or exceeded max package quota.
 */
export function isQuotaReached(selectedCount: number, maxQuota: number): boolean {
  return maxQuota > 0 && selectedCount >= maxQuota;
}

/**
 * Hard Quota Lock rule:
 * - Submitted sessions are locked from edits.
 * - Already selected photos can always be deselected while active.
 * - Unselected photos can only be clicked when selectedCount < maxQuota.
 */
export function canTogglePhotoSelection(params: {
  selectedCount: number;
  maxQuota: number;
  isCurrentlySelected: boolean;
  status: SessionStatus;
  isExpired: boolean;
}): boolean {
  if (params.isExpired || params.status === 'submitted') {
    return false;
  }
  if (params.isCurrentlySelected) {
    return true;
  }
  return params.selectedCount < params.maxQuota;
}

/**
 * Formats selected file names for Windows Explorer / macOS Finder (comma)
 * or Adobe Lightroom Library Filter (space or newline).
 */
export function formatSelectionFilenames(
  selections: Pick<PhotoSelection, 'file_name'>[],
  format: FilenameExportFormat
): string {
  const names = selections
    .map((item) => item.file_name.trim())
    .filter((name) => name.length > 0);

  if (names.length === 0) {
    return '';
  }

  switch (format) {
    case 'comma':
      return names.join(', ');
    case 'space':
      return names.join(' ');
    case 'newline':
      return names.join('\n');
    default:
      return names.join(', ');
  }
}

/**
 * Validates that PIN is 4 to 6 numeric digits.
 */
export function validatePinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin.trim());
}

/**
 * Generates a random 4-digit numeric PIN string.
 */
export function generateRandomPin(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return String(num);
}

/**
 * Validates Admin Session Create/Edit form inputs.
 */
export function validateSessionInput(input: SessionInput): {
  valid: boolean;
  errors: Partial<Record<keyof SessionInput, string>>;
  folderId: string | null;
} {
  const errors: Partial<Record<keyof SessionInput, string>> = {};

  if (!input.client_name.trim() || input.client_name.trim().length < 2) {
    errors.client_name = 'Nama klien / sesi wajib diisi (minimal 2 karakter).';
  }

  const folderId = extractDriveFolderId(input.drive_folder_url);
  if (!folderId) {
    errors.drive_folder_url =
      'Masukkan tautan folder Google Drive atau Folder ID yang valid.';
  }

  if (!Number.isFinite(input.max_quota) || input.max_quota < 1 || input.max_quota > 2000) {
    errors.max_quota = 'Kuota foto harus antara 1 hingga 2000.';
  }

  if (!validatePinFormat(input.pin_code)) {
    errors.pin_code = 'PIN akses harus terdiri dari 4–6 digit angka.';
  }

  if (!input.expires_at || !/^\d{4}-\d{2}-\d{2}$/.test(input.expires_at)) {
    errors.expires_at = 'Tanggal masa aktif galeri wajib diisi.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    folderId,
  };
}

/**
 * Builds direct shareable client gallery URL with ?session=<id>.
 */
export function buildClientShareUrl(origin: string, sessionId: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/?session=${encodeURIComponent(sessionId)}`;
}

/**
 * Formats YYYY-MM-DD date string to readable Indonesian date (e.g. "10 Des 2026").
 */
export function formatDisplayDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate || '-';
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return `${day} ${months[month - 1] ?? ''} ${year}`;
}
