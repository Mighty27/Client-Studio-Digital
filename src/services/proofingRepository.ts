import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  DrivePhoto,
  PhotoSelection,
  ProofingSession,
  SessionInput,
  SessionStatus,
} from '../types/proofing';
import { buildMockDrivePhotos, extractDriveFolderId } from '../utils/driveParser';
import { addDaysIsoDate } from '../utils/proofingRules';

const SESSIONS_STORAGE_KEY = 'lumina_proof_sessions_v1';
const SELECTIONS_STORAGE_KEY = 'lumina_proof_selections_v1';
const UNLOCK_STORAGE_PREFIX = 'lumina_proof_pin_unlocked_';

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

function buildSeedData(): {
  sessions: ProofingSession[];
  selections: PhotoSelection[];
} {
  const nowIso = new Date().toISOString();

  const activeSessionId = 'a1111111-1111-4111-8111-111111111111';
  const submittedSessionId = 'b2222222-2222-4222-8222-222222222222';
  const expiredSessionId = 'c3333333-3333-4333-8333-333333333333';

  const activeFolderId = '1LuminaWeddingRakaNadira2026';
  const submittedFolderId = '1LuminaPortraitWijayaStudio2026';
  const expiredFolderId = '1LuminaPrewedSitiArmanBromo2026';

  const sessions: ProofingSession[] = [
    {
      id: activeSessionId,
      client_name: 'Raka & Nadira — Akad & Resepsi',
      drive_folder_url: `https://drive.google.com/drive/folders/${activeFolderId}?usp=sharing`,
      drive_folder_id: activeFolderId,
      max_quota: 5,
      pin_code: '1234',
      expires_at: addDaysIsoDate(14),
      status: 'active',
      created_at: nowIso,
    },
    {
      id: submittedSessionId,
      client_name: 'Keluarga Wijaya — Studio Potret',
      drive_folder_url: `https://drive.google.com/drive/folders/${submittedFolderId}?usp=sharing`,
      drive_folder_id: submittedFolderId,
      max_quota: 4,
      pin_code: '8899',
      expires_at: addDaysIsoDate(7),
      status: 'submitted',
      created_at: nowIso,
    },
    {
      id: expiredSessionId,
      client_name: 'Siti & Arman — Prewedding Bromo',
      drive_folder_url: `https://drive.google.com/drive/folders/${expiredFolderId}?usp=sharing`,
      drive_folder_id: expiredFolderId,
      max_quota: 10,
      pin_code: '4321',
      expires_at: addDaysIsoDate(-4),
      status: 'active',
      created_at: nowIso,
    },
  ];

  const activePhotos = buildMockDrivePhotos(activeFolderId);
  const submittedPhotos = buildMockDrivePhotos(submittedFolderId);

  const selections: PhotoSelection[] = [
    {
      id: createUuid(),
      session_id: activeSessionId,
      file_id: activePhotos[0].id,
      file_name: activePhotos[0].name,
      thumbnail_url: activePhotos[0].thumbnailLink,
      selected_at: nowIso,
    },
    {
      id: createUuid(),
      session_id: activeSessionId,
      file_id: activePhotos[1].id,
      file_name: activePhotos[1].name,
      thumbnail_url: activePhotos[1].thumbnailLink,
      selected_at: nowIso,
    },
    ...[0, 2, 4, 7].map((idx) => ({
      id: createUuid(),
      session_id: submittedSessionId,
      file_id: submittedPhotos[idx].id,
      file_name: submittedPhotos[idx].name,
      thumbnail_url: submittedPhotos[idx].thumbnailLink,
      selected_at: nowIso,
    })),
  ];

  return { sessions, selections };
}

function readLocalStore(): {
  sessions: ProofingSession[];
  selections: PhotoSelection[];
} {
  try {
    const rawSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const rawSelections = localStorage.getItem(SELECTIONS_STORAGE_KEY);

    if (!rawSessions) {
      const seeded = buildSeedData();
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(seeded.sessions));
      localStorage.setItem(SELECTIONS_STORAGE_KEY, JSON.stringify(seeded.selections));
      return seeded;
    }

    const sessions = JSON.parse(rawSessions) as ProofingSession[];
    const selections = rawSelections ? (JSON.parse(rawSelections) as PhotoSelection[]) : [];
    return { sessions, selections };
  } catch {
    return buildSeedData();
  }
}

function writeLocalSessions(sessions: ProofingSession[]): void {
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

function writeLocalSelections(selections: PhotoSelection[]): void {
  localStorage.setItem(SELECTIONS_STORAGE_KEY, JSON.stringify(selections));
}

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
    // Ignore storage quota issues
  }
}

export function clearPinUnlockedInSession(sessionId: string): void {
  try {
    sessionStorage.removeItem(`${UNLOCK_STORAGE_PREFIX}${sessionId}`);
  } catch {
    // Ignore storage issues
  }
}

export async function listSessions(): Promise<ProofingSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as ProofingSession[];
    }
  }

  const { sessions } = readLocalStore();
  return [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getSessionById(sessionId: string): Promise<ProofingSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!error && data) {
      return data as ProofingSession;
    }
  }

  const { sessions } = readLocalStore();
  return sessions.find((s) => s.id === sessionId) ?? null;
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
    const { data, error } = await supabase
      .from('sessions')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as ProofingSession;
  }

  const store = readLocalStore();
  const created: ProofingSession = {
    id: createUuid(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  writeLocalSessions([created, ...store.sessions]);
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
    const { data, error } = await supabase
      .from('sessions')
      .update(payload)
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as ProofingSession;
  }

  const store = readLocalStore();
  let updatedItem: ProofingSession | null = null;
  const nextSessions = store.sessions.map((item) => {
    if (item.id === sessionId) {
      updatedItem = { ...item, ...payload };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error('Sesi tidak ditemukan.');
  }

  writeLocalSessions(nextSessions);
  return updatedItem;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<ProofingSession> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as ProofingSession;
  }

  const store = readLocalStore();
  let updatedItem: ProofingSession | null = null;
  const nextSessions = store.sessions.map((item) => {
    if (item.id === sessionId) {
      updatedItem = { ...item, status };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error('Sesi tidak ditemukan.');
  }
  writeLocalSessions(nextSessions);
  return updatedItem;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const store = readLocalStore();
  writeLocalSessions(store.sessions.filter((item) => item.id !== sessionId));
  writeLocalSelections(store.selections.filter((item) => item.session_id !== sessionId));
}

export async function listSelectionsBySession(
  sessionId: string
): Promise<PhotoSelection[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('selections')
      .select('*')
      .eq('session_id', sessionId)
      .order('selected_at', { ascending: true });

    if (!error && data) {
      return data as PhotoSelection[];
    }
  }

  const store = readLocalStore();
  return store.selections
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

    if (error) {
      throw new Error(error.message);
    }
    return data as PhotoSelection;
  }

  const store = readLocalStore();
  const existing = store.selections.find(
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

  writeLocalSelections([...store.selections, created]);
  return created;
}

export async function removeSelection(sessionId: string, fileId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('selections')
      .delete()
      .eq('session_id', sessionId)
      .eq('file_id', fileId);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const store = readLocalStore();
  writeLocalSelections(
    store.selections.filter(
      (item) => !(item.session_id === sessionId && item.file_id === fileId)
    )
  );
}

/**
 * Subscribes to live selection changes (Supabase Realtime + localStorage cross-tab listener).
 */
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
  window.addEventListener('storage', onStorage);

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
    if (supabaseChannel && supabase) {
      void supabase.removeChannel(supabaseChannel);
    }
  };
}
