import type {
  FilenameExportFormat,
  PhotoSelection,
  ProfileUpdateInput,
  ProofingSession,
  RegisterAccountInput,
  ScheduleInput,
  SessionInput,
  SessionStatus,
  StudioSchedule,
  StudioTask,
  TaskInput,
  TeamMemberInput,
  TeamRole,
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
 * Computes whole calendar days from todayIso to targetIso.
 * Negative values mean targetIso is in the past.
 */
export function daysUntilDate(
  targetIso: string | null,
  todayIso: string = getLocalTodayIsoDate()
): number | null {
  if (!targetIso || !/^\d{4}-\d{2}-\d{2}$/.test(targetIso)) {
    return null;
  }
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const [ey, em, ed] = targetIso.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
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
 * True when an active session expires within 0..7 days from today.
 */
export function isExpiringSoon(
  expiresAt: string,
  status: SessionStatus,
  todayIso: string = getLocalTodayIsoDate()
): boolean {
  if (status !== 'active') {
    return false;
  }
  const diff = daysUntilDate(expiresAt, todayIso);
  return diff !== null && diff >= 0 && diff <= 7;
}

/**
 * Returns top N active sessions sorted by closest expires_at ascending.
 */
export function getUpcomingDeadlines(
  sessions: ProofingSession[],
  limit = 5
): ProofingSession[] {
  return sessions
    .filter((s) => s.status === 'active')
    .sort((a, b) => a.expires_at.localeCompare(b.expires_at))
    .slice(0, limit);
}

/**
 * True when a task has a due_date before today and is not done.
 */
export function isTaskOverdue(
  task: Pick<StudioTask, 'due_date' | 'status'>,
  todayIso: string = getLocalTodayIsoDate()
): boolean {
  if (task.status === 'done' || !task.due_date) {
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.due_date)) {
    return false;
  }
  return todayIso > task.due_date;
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
 * - Submitted or expired sessions are locked from edits.
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
 * Validates Task creation inputs.
 */
export function validateTaskInput(input: TaskInput): {
  valid: boolean;
  errors: Partial<Record<keyof TaskInput, string>>;
} {
  const errors: Partial<Record<keyof TaskInput, string>> = {};
  if (!input.title.trim() || input.title.trim().length < 2) {
    errors.title = 'Judul tugas wajib diisi (minimal 2 karakter).';
  }
  if (input.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(input.due_date)) {
    errors.due_date = 'Format tanggal tenggat tidak valid.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
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
export function formatDisplayDate(isoDate: string | null): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
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

/**
 * Converts HH:MM string to total minutes since midnight.
 */
function parseTimeToMinutes(hhmm: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) {
    return null;
  }
  const [h, m] = hhmm.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

/**
 * Validates Shooting Schedule Create/Edit inputs.
 */
export function validateScheduleInput(input: ScheduleInput): {
  valid: boolean;
  errors: Partial<Record<keyof ScheduleInput, string>>;
} {
  const errors: Partial<Record<keyof ScheduleInput, string>> = {};

  if (!input.title.trim() || input.title.trim().length < 2) {
    errors.title = 'Nama event / sesi pemotretan wajib diisi (minimal 2 karakter).';
  }

  if (!input.client_name.trim() || input.client_name.trim().length < 2) {
    errors.client_name = 'Nama klien wajib diisi (minimal 2 karakter).';
  }

  if (!input.shoot_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.shoot_date)) {
    errors.shoot_date = 'Tanggal pemotretan wajib diisi.';
  }

  const startMin = parseTimeToMinutes(input.start_time);
  const endMin = parseTimeToMinutes(input.end_time);

  if (startMin === null) {
    errors.start_time = 'Format jam mulai tidak valid.';
  }
  if (endMin === null) {
    errors.end_time = 'Format jam selesai tidak valid.';
  } else if (startMin !== null && endMin <= startMin) {
    errors.end_time = 'Jam selesai harus lebih lambat dari jam mulai.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Finds active ('scheduled') events on the same date whose time range overlaps
 * with the candidate schedule (excluding `excludeId` when editing).
 */
export function findScheduleConflicts(
  candidate: {
    id?: string;
    shoot_date: string;
    start_time: string;
    end_time: string;
    status?: StudioSchedule['status'];
  },
  existing: StudioSchedule[]
): StudioSchedule[] {
  if (candidate.status === 'cancelled') {
    return [];
  }
  const cStart = parseTimeToMinutes(candidate.start_time);
  const cEnd = parseTimeToMinutes(candidate.end_time);
  if (cStart === null || cEnd === null || cEnd <= cStart) {
    return [];
  }

  return existing.filter((item) => {
    if (candidate.id && item.id === candidate.id) {
      return false;
    }
    if (item.status === 'cancelled' || item.shoot_date !== candidate.shoot_date) {
      return false;
    }
    const iStart = parseTimeToMinutes(item.start_time);
    const iEnd = parseTimeToMinutes(item.end_time);
    if (iStart === null || iEnd === null) {
      return false;
    }
    return cStart < iEnd && cEnd > iStart;
  });
}

/**
 * Returns upcoming scheduled shooting events sorted chronologically by date & start_time.
 */
export function getUpcomingSchedules(
  schedules: StudioSchedule[],
  todayIso: string = getLocalTodayIsoDate(),
  limit = 5
): StudioSchedule[] {
  return schedules
    .filter((item) => item.status === 'scheduled' && item.shoot_date >= todayIso)
    .sort((a, b) => {
      const dateCmp = a.shoot_date.localeCompare(b.shoot_date);
      return dateCmp !== 0 ? dateCmp : a.start_time.localeCompare(b.start_time);
    })
    .slice(0, limit);
}

export interface CalendarDayCell {
  isoDate: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

/**
 * Builds a Monday-first calendar grid (multiples of 7 cells) for a given year and 0-based month.
 */
export function buildMonthCalendarGrid(
  year: number,
  monthIndex: number
): CalendarDayCell[] {
  const firstDay = new Date(year, monthIndex, 1);
  // JS getDay(): 0=Sun..6=Sat -> Monday-first offset: 0=Mon..6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < totalCells; i += 1) {
    const cellDate = new Date(year, monthIndex, 1 - startOffset + i);
    cells.push({
      isoDate: getLocalTodayIsoDate(cellDate),
      dayNumber: cellDate.getDate(),
      inCurrentMonth:
        cellDate.getFullYear() === year && cellDate.getMonth() === monthIndex,
    });
  }
  return cells;
}

/**
 * True for owner and admin roles who can manage team members and studio settings.
 */
export function canManageTeam(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Determines which roles an actor is allowed to assign when creating/editing members.
 */
export function getAssignableRolesForActor(actorRole: TeamRole): TeamRole[] {
  if (actorRole === 'owner') {
    return ['owner', 'admin', 'member'];
  }
  if (actorRole === 'admin') {
    return ['admin', 'member'];
  }
  return [];
}

/**
 * Checks whether an actor can edit a target team member's profile/role.
 */
export function canEditTeamMember(
  actor: { id: string; role: TeamRole },
  target: { id: string; role: TeamRole }
): boolean {
  if (!canManageTeam(actor.role)) {
    return false;
  }
  if (actor.role === 'admin' && target.role === 'owner') {
    return false;
  }
  return true;
}

/**
 * Checks whether an actor can delete a target team member (cannot delete self or higher owner).
 */
export function canDeleteTeamMember(
  actor: { id: string; role: TeamRole },
  target: { id: string; role: TeamRole }
): boolean {
  if (actor.id === target.id) {
    return false;
  }
  return canEditTeamMember(actor, target);
}

/**
 * Extracts 1-2 uppercase initials for avatar badges.
 */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTeamMemberInput(
  input: TeamMemberInput,
  isCreating: boolean
): {
  valid: boolean;
  errors: Partial<Record<keyof TeamMemberInput, string>>;
} {
  const errors: Partial<Record<keyof TeamMemberInput, string>> = {};

  if (!input.full_name.trim() || input.full_name.trim().length < 2) {
    errors.full_name = 'Nama lengkap wajib diisi (minimal 2 karakter).';
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Format email tidak valid.';
  }
  if (isCreating) {
    if (!input.password || input.password.length < 6) {
      errors.password = 'Kata sandi wajib diisi (minimal 6 karakter).';
    }
  } else if (input.password && input.password.length > 0 && input.password.length < 6) {
    errors.password = 'Kata sandi baru minimal 6 karakter.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRegisterInput(input: RegisterAccountInput): {
  valid: boolean;
  errors: Partial<Record<keyof RegisterAccountInput, string>>;
} {
  const errors: Partial<Record<keyof RegisterAccountInput, string>> = {};

  if (!input.full_name.trim() || input.full_name.trim().length < 2) {
    errors.full_name = 'Nama lengkap wajib diisi (minimal 2 karakter).';
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Masukkan alamat email yang valid.';
  }
  if (!input.password || input.password.length < 6) {
    errors.password = 'Kata sandi minimal 6 karakter.';
  }
  if (input.confirm_password !== input.password) {
    errors.confirm_password = 'Konfirmasi kata sandi tidak cocok.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateProfileInput(input: ProfileUpdateInput): {
  valid: boolean;
  errors: Partial<Record<keyof ProfileUpdateInput, string>>;
} {
  const errors: Partial<Record<keyof ProfileUpdateInput, string>> = {};

  if (!input.full_name.trim() || input.full_name.trim().length < 2) {
    errors.full_name = 'Nama lengkap wajib diisi (minimal 2 karakter).';
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Format email tidak valid.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePasswordChangeInput(params: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): {
  valid: boolean;
  errors: Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>;
} {
  const errors: Partial<
    Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>
  > = {};

  if (!params.currentPassword) {
    errors.currentPassword = 'Kata sandi saat ini wajib diisi.';
  }
  if (!params.newPassword || params.newPassword.length < 6) {
    errors.newPassword = 'Kata sandi baru minimal 6 karakter.';
  }
  if (params.confirmPassword !== params.newPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi baru tidak cocok.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
