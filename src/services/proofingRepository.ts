import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  DrivePhoto,
  PhotoSelection,
  ProfileUpdateInput,
  ProofingSession,
  RegisterAccountInput,
  ScheduleInput,
  ScheduleStatus,
  SessionInput,
  SessionStatus,
  StoredTeamMemberRecord,
  StudioSchedule,
  StudioTask,
  TaskInput,
  TaskStatus,
  TeamMember,
  TeamMemberInput,
  TeamRole,
} from '../types/proofing';
import { extractDriveFolderId } from '../utils/driveParser';
import { hashPassword, verifyPassword } from '../utils/passwordCrypto';
import {
  canDeleteTeamMember,
  canEditTeamMember,
  canManageTeam,
  getAssignableRolesForActor,
} from '../utils/proofingRules';

const SESSIONS_STORAGE_KEY = 'lumina_proof_sessions_v1';
const SELECTIONS_STORAGE_KEY = 'lumina_proof_selections_v1';
const TASKS_STORAGE_KEY = 'lumina_proof_tasks_v1';
const SCHEDULES_STORAGE_KEY = 'lumina_proof_schedules_v1';
const TEAM_MEMBERS_STORAGE_KEY = 'lumina_proof_team_members_v1';
const AUTH_SESSION_STORAGE_KEY = 'lumina_proof_auth_user_id';
const UNLOCK_STORAGE_PREFIX = 'lumina_proof_pin_unlocked_';
const LOCAL_STORE_EVENT = 'lumina-store-updated';

const LEGACY_DEMO_SESSION_IDS = new Set([
  'a1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  'c3333333-3333-4333-8333-333333333333',
]);

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function notifyLocalUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOCAL_STORE_EVENT));
  }
}

function readJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
  notifyLocalUpdate();
}

function readLocalSessions(): ProofingSession[] {
  const sessions = readJsonArray<ProofingSession>(SESSIONS_STORAGE_KEY);
  if (sessions.some((s) => LEGACY_DEMO_SESSION_IDS.has(s.id))) {
    const cleaned = sessions.filter((s) => !LEGACY_DEMO_SESSION_IDS.has(s.id));
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  }
  return sessions;
}

function readLocalSelections(): PhotoSelection[] {
  const selections = readJsonArray<PhotoSelection>(SELECTIONS_STORAGE_KEY);
  if (selections.some((sel) => LEGACY_DEMO_SESSION_IDS.has(sel.session_id))) {
    const cleaned = selections.filter(
      (sel) => !LEGACY_DEMO_SESSION_IDS.has(sel.session_id)
    );
    localStorage.setItem(SELECTIONS_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  }
  return selections;
}

function readLocalTasks(): StudioTask[] {
  return readJsonArray<StudioTask>(TASKS_STORAGE_KEY);
}

function readLocalSchedules(): StudioSchedule[] {
  return readJsonArray<StudioSchedule>(SCHEDULES_STORAGE_KEY);
}

function readLocalTeamRecords(): StoredTeamMemberRecord[] {
  return readJsonArray<StoredTeamMemberRecord>(TEAM_MEMBERS_STORAGE_KEY);
}

function toPublicTeamMember(record: StoredTeamMemberRecord): TeamMember {
  return {
    id: record.id,
    full_name: record.full_name,
    email: record.email,
    role: record.role,
    job_title: record.job_title,
    phone: record.phone,
    bio: record.bio,
    is_active: record.is_active,
    created_at: record.created_at,
  };
}

export function getStoredAuthUserId(): string | null {
  try {
    const val = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    return val && val.trim().length > 0 ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredAuthUserId(userId: string): void {
  try {
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, userId);
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredAuthUserId(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// PIN Session Storage Helpers
// ============================================================================

export function isPinUnlockedInSession(sessionId: string): boolean {
  try {
    return sessionStorage.getItem(`${UNLOCK_STORAGE_PREFIX}${sessionId}`) === '1';
  } catch {
    return false;
  }
}

export function markPinUnlockedInSession(sessionId: string): void {
  try {
    sessionStorage.setItem(`${UNLOCK_STORAGE_PREFIX}${sessionId}`, '1');
  } catch {
    // Ignore storage quota errors
  }
}

export function clearPinUnlockedInSession(sessionId: string): void {
  try {
    sessionStorage.removeItem(`${UNLOCK_STORAGE_PREFIX}${sessionId}`);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Sessions Repository (Supabase -> localStorage Fallback)
// ============================================================================

export async function listSessions(): Promise<ProofingSession[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ProofingSession[];
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase listSessions fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase listSessions exception:', err);
    }
  }

  return [...readLocalSessions()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getSessionById(sessionId: string): Promise<ProofingSession | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (!error && data) {
        return data as ProofingSession;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase getSessionById fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase getSessionById exception:', err);
    }
  }

  return readLocalSessions().find((s) => s.id === sessionId) ?? null;
}

export async function createSession(input: SessionInput): Promise<ProofingSession> {
  const folderId = extractDriveFolderId(input.drive_folder_url) ?? '';
  const payload = {
    client_name: input.client_name.trim(),
    drive_folder_url: input.drive_folder_url.trim(),
    drive_folder_id: folderId,
    max_quota: Number(input.max_quota),
    pin_code: input.pin_code.trim(),
    expires_at: input.expires_at,
    status: input.status,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert(payload)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as ProofingSession;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase createSession fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase createSession exception:', err);
    }
  }

  const created: ProofingSession = {
    id: createUuid(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  writeJsonArray(SESSIONS_STORAGE_KEY, [created, ...readLocalSessions()]);
  return created;
}

export async function updateSession(
  sessionId: string,
  input: SessionInput
): Promise<ProofingSession> {
  const folderId = extractDriveFolderId(input.drive_folder_url) ?? '';
  const payload = {
    client_name: input.client_name.trim(),
    drive_folder_url: input.drive_folder_url.trim(),
    drive_folder_id: folderId,
    max_quota: Number(input.max_quota),
    pin_code: input.pin_code.trim(),
    expires_at: input.expires_at,
    status: input.status,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(payload)
        .eq('id', sessionId)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as ProofingSession;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase updateSession fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateSession exception:', err);
    }
  }

  let updatedItem: ProofingSession | null = null;
  const nextSessions = readLocalSessions().map((item) => {
    if (item.id === sessionId) {
      updatedItem = { ...item, ...payload };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error('Sesi tidak ditemukan.');
  }
  writeJsonArray(SESSIONS_STORAGE_KEY, nextSessions);
  return updatedItem;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<ProofingSession> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as ProofingSession;
      }
      if (error) {
        console.warn(
          '[Lumina Proof] Supabase updateSessionStatus fallback:',
          error.message
        );
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateSessionStatus exception:', err);
    }
  }

  let updatedItem: ProofingSession | null = null;
  const nextSessions = readLocalSessions().map((item) => {
    if (item.id === sessionId) {
      updatedItem = { ...item, status };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error('Sesi tidak ditemukan.');
  }
  writeJsonArray(SESSIONS_STORAGE_KEY, nextSessions);
  return updatedItem;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (!error) {
        notifyLocalUpdate();
        return;
      }
      console.warn('[Lumina Proof] Supabase deleteSession fallback:', error.message);
    } catch (err) {
      console.warn('[Lumina Proof] Supabase deleteSession exception:', err);
    }
  }

  writeJsonArray(
    SESSIONS_STORAGE_KEY,
    readLocalSessions().filter((item) => item.id !== sessionId)
  );
  writeJsonArray(
    SELECTIONS_STORAGE_KEY,
    readLocalSelections().filter((item) => item.session_id !== sessionId)
  );
}

// ============================================================================
// Selections Repository (Supabase -> localStorage Fallback)
// ============================================================================

export async function listSelectionsBySession(
  sessionId: string
): Promise<PhotoSelection[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('selections')
        .select('*')
        .eq('session_id', sessionId)
        .order('selected_at', { ascending: true });

      if (!error && data) {
        return data as PhotoSelection[];
      }
      if (error) {
        console.warn(
          '[Lumina Proof] Supabase listSelectionsBySession fallback:',
          error.message
        );
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase listSelectionsBySession exception:', err);
    }
  }

  return readLocalSelections()
    .filter((item) => item.session_id === sessionId)
    .sort(
      (a, b) => new Date(a.selected_at).getTime() - new Date(b.selected_at).getTime()
    );
}

export async function addSelection(
  sessionId: string,
  photo: DrivePhoto
): Promise<PhotoSelection> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('selections')
        .insert({
          session_id: sessionId,
          file_id: photo.id,
          file_name: photo.name,
          thumbnail_url: photo.thumbnailLink,
        })
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as PhotoSelection;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase addSelection fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase addSelection exception:', err);
    }
  }

  const current = readLocalSelections();
  const existing = current.find(
    (item) => item.session_id === sessionId && item.file_id === photo.id
  );
  if (existing) {
    return existing;
  }

  const created: PhotoSelection = {
    id: createUuid(),
    session_id: sessionId,
    file_id: photo.id,
    file_name: photo.name,
    thumbnail_url: photo.thumbnailLink,
    selected_at: new Date().toISOString(),
  };
  writeJsonArray(SELECTIONS_STORAGE_KEY, [...current, created]);
  return created;
}

export async function removeSelection(sessionId: string, fileId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('selections')
        .delete()
        .eq('session_id', sessionId)
        .eq('file_id', fileId);

      if (!error) {
        notifyLocalUpdate();
        return;
      }
      console.warn('[Lumina Proof] Supabase removeSelection fallback:', error.message);
    } catch (err) {
      console.warn('[Lumina Proof] Supabase removeSelection exception:', err);
    }
  }

  writeJsonArray(
    SELECTIONS_STORAGE_KEY,
    readLocalSelections().filter(
      (item) => !(item.session_id === sessionId && item.file_id === fileId)
    )
  );
}

// ============================================================================
// Studio Tasks Repository (Supabase -> localStorage Fallback)
// ============================================================================

export async function listTasks(): Promise<StudioTask[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as StudioTask[];
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase listTasks fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase listTasks exception:', err);
    }
  }

  return [...readLocalTasks()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createTask(input: TaskInput): Promise<StudioTask> {
  const payload = {
    title: input.title.trim(),
    notes: input.notes.trim(),
    session_id: input.session_id || null,
    due_date: input.due_date || null,
    status: input.status ?? ('todo' as TaskStatus),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as StudioTask;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase createTask fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase createTask exception:', err);
    }
  }

  const created: StudioTask = {
    id: createUuid(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  writeJsonArray(TASKS_STORAGE_KEY, [created, ...readLocalTasks()]);
  return created;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<StudioTask> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as StudioTask;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase updateTaskStatus fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateTaskStatus exception:', err);
    }
  }

  let updatedTask: StudioTask | null = null;
  const nextTasks = readLocalTasks().map((task) => {
    if (task.id === taskId) {
      updatedTask = { ...task, status };
      return updatedTask;
    }
    return task;
  });

  if (!updatedTask) {
    throw new Error('Tugas tidak ditemukan.');
  }
  writeJsonArray(TASKS_STORAGE_KEY, nextTasks);
  return updatedTask;
}

export async function deleteTask(taskId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (!error) {
        notifyLocalUpdate();
        return;
      }
      console.warn('[Lumina Proof] Supabase deleteTask fallback:', error.message);
    } catch (err) {
      console.warn('[Lumina Proof] Supabase deleteTask exception:', err);
    }
  }

  writeJsonArray(
    TASKS_STORAGE_KEY,
    readLocalTasks().filter((task) => task.id !== taskId)
  );
}

// ============================================================================
// Studio Schedules Repository (Supabase -> localStorage Fallback)
// ============================================================================

export async function listSchedules(): Promise<StudioSchedule[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('shoot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        return data as StudioSchedule[];
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase listSchedules fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase listSchedules exception:', err);
    }
  }

  return [...readLocalSchedules()].sort((a, b) => {
    const dateCmp = a.shoot_date.localeCompare(b.shoot_date);
    return dateCmp !== 0 ? dateCmp : a.start_time.localeCompare(b.start_time);
  });
}

export async function createSchedule(input: ScheduleInput): Promise<StudioSchedule> {
  const payload = {
    title: input.title.trim(),
    client_name: input.client_name.trim(),
    event_type: input.event_type,
    shoot_date: input.shoot_date,
    start_time: input.start_time,
    end_time: input.end_time,
    location: input.location.trim(),
    photographer: input.photographer.trim(),
    session_id: input.session_id || null,
    status: input.status,
    notes: input.notes.trim(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .insert(payload)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as StudioSchedule;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase createSchedule fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase createSchedule exception:', err);
    }
  }

  const created: StudioSchedule = {
    id: createUuid(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  writeJsonArray(SCHEDULES_STORAGE_KEY, [created, ...readLocalSchedules()]);
  return created;
}

export async function updateSchedule(
  scheduleId: string,
  input: ScheduleInput
): Promise<StudioSchedule> {
  const payload = {
    title: input.title.trim(),
    client_name: input.client_name.trim(),
    event_type: input.event_type,
    shoot_date: input.shoot_date,
    start_time: input.start_time,
    end_time: input.end_time,
    location: input.location.trim(),
    photographer: input.photographer.trim(),
    session_id: input.session_id || null,
    status: input.status,
    notes: input.notes.trim(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update(payload)
        .eq('id', scheduleId)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as StudioSchedule;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase updateSchedule fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateSchedule exception:', err);
    }
  }

  let updatedItem: StudioSchedule | null = null;
  const nextSchedules = readLocalSchedules().map((item) => {
    if (item.id === scheduleId) {
      updatedItem = { ...item, ...payload };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error('Jadwal tidak ditemukan.');
  }
  writeJsonArray(SCHEDULES_STORAGE_KEY, nextSchedules);
  return updatedItem;
}

export async function updateScheduleStatus(
  scheduleId: string,
  status: ScheduleStatus
): Promise<StudioSchedule> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update({ status })
        .eq('id', scheduleId)
        .select('*')
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as StudioSchedule;
      }
      if (error) {
        console.warn(
          '[Lumina Proof] Supabase updateScheduleStatus fallback:',
          error.message
        );
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateScheduleStatus exception:', err);
    }
  }

  let updatedItem: StudioSchedule | null = null;
  const nextSchedules = readLocalSchedules().map((item) => {
    if (item.id === scheduleId) {
      updatedItem = { ...item, status };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error('Jadwal tidak ditemukan.');
  }
  writeJsonArray(SCHEDULES_STORAGE_KEY, nextSchedules);
  return updatedItem;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
      if (!error) {
        notifyLocalUpdate();
        return;
      }
      console.warn('[Lumina Proof] Supabase deleteSchedule fallback:', error.message);
    } catch (err) {
      console.warn('[Lumina Proof] Supabase deleteSchedule exception:', err);
    }
  }

  writeJsonArray(
    SCHEDULES_STORAGE_KEY,
    readLocalSchedules().filter((item) => item.id !== scheduleId)
  );
}

// ============================================================================
// Team Members & Auth Repository (Supabase -> localStorage Fallback)
// ============================================================================

const PUBLIC_TEAM_COLUMNS =
  'id, full_name, email, role, job_title, phone, bio, is_active, created_at';

async function listAllStoredTeamRecords(): Promise<StoredTeamMemberRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as StoredTeamMemberRecord[];
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase team_members fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase team_members exception:', err);
    }
  }

  return [...readLocalTeamRecords()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(PUBLIC_TEAM_COLUMNS)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as TeamMember[];
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase listTeamMembers fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase listTeamMembers exception:', err);
    }
  }

  return [...readLocalTeamRecords()]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(toPublicTeamMember);
}

export async function getTeamMemberById(userId: string): Promise<TeamMember | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(PUBLIC_TEAM_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as TeamMember;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase getTeamMemberById fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase getTeamMemberById exception:', err);
    }
  }

  const found = readLocalTeamRecords().find((m) => m.id === userId);
  return found ? toPublicTeamMember(found) : null;
}

export async function authenticateTeamMember(
  email: string,
  password: string
): Promise<TeamMember> {
  const normalizedEmail = email.trim().toLowerCase();
  const records = await listAllStoredTeamRecords();
  const matched = records.find(
    (item) => item.email.trim().toLowerCase() === normalizedEmail
  );

  if (!matched) {
    throw new Error('Email atau kata sandi tidak sesuai.');
  }

  const passwordValid = await verifyPassword(password, matched.password_hash);
  if (!passwordValid) {
    throw new Error('Email atau kata sandi tidak sesuai.');
  }

  if (!matched.is_active) {
    throw new Error(
      'Akun Anda sedang dinonaktifkan. Hubungi Owner atau Admin studio.'
    );
  }

  return toPublicTeamMember(matched);
}

export async function registerTeamAccount(
  input: RegisterAccountInput
): Promise<TeamMember> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await listTeamMembers();

  if (existing.some((m) => m.email.trim().toLowerCase() === normalizedEmail)) {
    throw new Error('Email ini sudah terdaftar pada studio.');
  }

  // First account ever created becomes Owner; subsequent hidden-page registrations become read-only Member
  const assignedRole: TeamRole = existing.length === 0 ? 'owner' : 'member';
  const passwordHash = await hashPassword(input.password);

  const payload = {
    full_name: input.full_name.trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    role: assignedRole,
    job_title: input.job_title.trim() || (assignedRole === 'owner' ? 'Studio Owner' : 'Tim Studio'),
    phone: input.phone.trim(),
    bio: '',
    is_active: true,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert(payload)
        .select(PUBLIC_TEAM_COLUMNS)
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as TeamMember;
      }
      if (error) {
        if (error.code === '23505') {
          throw new Error('Email ini sudah terdaftar pada studio.');
        }
        console.warn('[Lumina Proof] Supabase registerTeamAccount fallback:', error.message);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('sudah terdaftar')) {
        throw err;
      }
      console.warn('[Lumina Proof] Supabase registerTeamAccount exception:', err);
    }
  }

  const created: StoredTeamMemberRecord = {
    id: createUuid(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  writeJsonArray(TEAM_MEMBERS_STORAGE_KEY, [...readLocalTeamRecords(), created]);
  return toPublicTeamMember(created);
}

export async function createTeamMemberByAdmin(
  actor: TeamMember,
  input: TeamMemberInput
): Promise<TeamMember> {
  if (!canManageTeam(actor.role)) {
    throw new Error('Anda tidak memiliki izin untuk menambah anggota.');
  }

  const allowedRoles = getAssignableRolesForActor(actor.role);
  const safeRole: TeamRole = allowedRoles.includes(input.role) ? input.role : 'member';

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await listTeamMembers();
  if (existing.some((m) => m.email.trim().toLowerCase() === normalizedEmail)) {
    throw new Error('Email tersebut sudah digunakan anggota lain.');
  }

  const passwordHash = await hashPassword(input.password ?? '');
  const payload = {
    full_name: input.full_name.trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    role: safeRole,
    job_title: input.job_title.trim(),
    phone: input.phone.trim(),
    bio: input.bio.trim(),
    is_active: input.is_active,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert(payload)
        .select(PUBLIC_TEAM_COLUMNS)
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as TeamMember;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase createTeamMember fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase createTeamMember exception:', err);
    }
  }

  const created: StoredTeamMemberRecord = {
    id: createUuid(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  writeJsonArray(TEAM_MEMBERS_STORAGE_KEY, [...readLocalTeamRecords(), created]);
  return toPublicTeamMember(created);
}

export async function updateTeamMemberByAdmin(
  actor: TeamMember,
  targetMember: TeamMember,
  input: TeamMemberInput
): Promise<TeamMember> {
  if (!canEditTeamMember(actor, targetMember)) {
    throw new Error('Anda tidak memiliki izin untuk mengubah anggota ini.');
  }

  const allowedRoles = getAssignableRolesForActor(actor.role);
  const safeRole: TeamRole =
    targetMember.role === 'owner' && actor.role !== 'owner'
      ? 'owner'
      : allowedRoles.includes(input.role)
        ? input.role
        : targetMember.role;

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await listTeamMembers();
  if (
    existing.some(
      (m) =>
        m.id !== targetMember.id && m.email.trim().toLowerCase() === normalizedEmail
    )
  ) {
    throw new Error('Email tersebut sudah digunakan anggota lain.');
  }

  const updateFields: Record<string, unknown> = {
    full_name: input.full_name.trim(),
    email: normalizedEmail,
    role: safeRole,
    job_title: input.job_title.trim(),
    phone: input.phone.trim(),
    bio: input.bio.trim(),
    is_active: actor.id === targetMember.id ? true : input.is_active,
  };

  if (input.password && input.password.trim().length >= 6) {
    updateFields.password_hash = await hashPassword(input.password.trim());
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update(updateFields)
        .eq('id', targetMember.id)
        .select(PUBLIC_TEAM_COLUMNS)
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as TeamMember;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase updateTeamMember fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateTeamMember exception:', err);
    }
  }

  let updatedRecord: StoredTeamMemberRecord | null = null;
  const nextRecords = readLocalTeamRecords().map((item) => {
    if (item.id === targetMember.id) {
      updatedRecord = {
        ...item,
        full_name: String(updateFields.full_name),
        email: String(updateFields.email),
        role: updateFields.role as TeamRole,
        job_title: String(updateFields.job_title),
        phone: String(updateFields.phone),
        bio: String(updateFields.bio),
        is_active: Boolean(updateFields.is_active),
        password_hash:
          typeof updateFields.password_hash === 'string'
            ? updateFields.password_hash
            : item.password_hash,
      };
      return updatedRecord;
    }
    return item;
  });

  if (!updatedRecord) {
    throw new Error('Anggota tidak ditemukan.');
  }
  writeJsonArray(TEAM_MEMBERS_STORAGE_KEY, nextRecords);
  return toPublicTeamMember(updatedRecord);
}

export async function updateOwnProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<TeamMember> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await listTeamMembers();
  if (
    existing.some(
      (m) => m.id !== userId && m.email.trim().toLowerCase() === normalizedEmail
    )
  ) {
    throw new Error('Email tersebut sudah dipakai akun lain.');
  }

  const updateFields = {
    full_name: input.full_name.trim(),
    email: normalizedEmail,
    job_title: input.job_title.trim(),
    phone: input.phone.trim(),
    bio: input.bio.trim(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update(updateFields)
        .eq('id', userId)
        .select(PUBLIC_TEAM_COLUMNS)
        .single();

      if (!error && data) {
        notifyLocalUpdate();
        return data as TeamMember;
      }
      if (error) {
        console.warn('[Lumina Proof] Supabase updateOwnProfile fallback:', error.message);
      }
    } catch (err) {
      console.warn('[Lumina Proof] Supabase updateOwnProfile exception:', err);
    }
  }

  let updatedRecord: StoredTeamMemberRecord | null = null;
  const nextRecords = readLocalTeamRecords().map((item) => {
    if (item.id === userId) {
      updatedRecord = { ...item, ...updateFields };
      return updatedRecord;
    }
    return item;
  });

  if (!updatedRecord) {
    throw new Error('Akun pengguna tidak ditemukan.');
  }
  writeJsonArray(TEAM_MEMBERS_STORAGE_KEY, nextRecords);
  return toPublicTeamMember(updatedRecord);
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const records = await listAllStoredTeamRecords();
  const target = records.find((m) => m.id === userId);
  if (!target) {
    throw new Error('Akun pengguna tidak ditemukan.');
  }

  const isValid = await verifyPassword(currentPassword, target.password_hash);
  if (!isValid) {
    throw new Error('Kata sandi saat ini tidak sesuai.');
  }

  const nextHash = await hashPassword(newPassword);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ password_hash: nextHash })
        .eq('id', userId);

      if (!error) {
        notifyLocalUpdate();
        return;
      }
      console.warn('[Lumina Proof] Supabase changeOwnPassword fallback:', error.message);
    } catch (err) {
      console.warn('[Lumina Proof] Supabase changeOwnPassword exception:', err);
    }
  }

  const nextRecords = readLocalTeamRecords().map((item) =>
    item.id === userId ? { ...item, password_hash: nextHash } : item
  );
  writeJsonArray(TEAM_MEMBERS_STORAGE_KEY, nextRecords);
}

export async function deleteTeamMember(
  actor: TeamMember,
  targetMember: TeamMember
): Promise<void> {
  if (!canDeleteTeamMember(actor, targetMember)) {
    throw new Error('Anda tidak memiliki izin untuk menghapus anggota ini.');
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', targetMember.id);
      if (!error) {
        notifyLocalUpdate();
        return;
      }
      console.warn('[Lumina Proof] Supabase deleteTeamMember fallback:', error.message);
    } catch (err) {
      console.warn('[Lumina Proof] Supabase deleteTeamMember exception:', err);
    }
  }

  writeJsonArray(
    TEAM_MEMBERS_STORAGE_KEY,
    readLocalTeamRecords().filter((item) => item.id !== targetMember.id)
  );
}

// ============================================================================
// Realtime Subscriptions (Supabase Realtime + localStorage Cross-Tab)
// ============================================================================

export function subscribeToSessionUpdates(
  sessionId: string,
  onChange: () => void
): () => void {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === SELECTIONS_STORAGE_KEY ||
      event.key === SESSIONS_STORAGE_KEY
    ) {
      onChange();
    }
  };
  const onLocalEvent = () => onChange();

  window.addEventListener('storage', onStorage);
  window.addEventListener(LOCAL_STORE_EVENT, onLocalEvent);

  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (isSupabaseConfigured && supabase) {
    supabaseChannel = supabase
      .channel(`proofing-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'selections',
          filter: `session_id=eq.${sessionId}`,
        },
        () => onChange()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => onChange()
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LOCAL_STORE_EVENT, onLocalEvent);
    if (supabaseChannel && supabase) {
      void supabase.removeChannel(supabaseChannel);
    }
  };
}

export function subscribeToWorkspaceUpdates(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === SESSIONS_STORAGE_KEY ||
      event.key === SELECTIONS_STORAGE_KEY ||
      event.key === TASKS_STORAGE_KEY ||
      event.key === SCHEDULES_STORAGE_KEY ||
      event.key === TEAM_MEMBERS_STORAGE_KEY
    ) {
      onChange();
    }
  };
  const onLocalEvent = () => onChange();

  window.addEventListener('storage', onStorage);
  window.addEventListener(LOCAL_STORE_EVENT, onLocalEvent);

  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (isSupabaseConfigured && supabase) {
    supabaseChannel = supabase
      .channel('studio-workspace-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'selections' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => onChange()
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LOCAL_STORE_EVENT, onLocalEvent);
    if (supabaseChannel && supabase) {
      void supabase.removeChannel(supabaseChannel);
    }
  };
}
