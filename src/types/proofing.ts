export type SessionStatus = 'draft' | 'active' | 'submitted';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type ScheduleEventType =
  | 'wedding'
  | 'prewedding'
  | 'portrait'
  | 'commercial'
  | 'event'
  | 'other';

export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled';

export type FilenameExportFormat = 'comma' | 'space' | 'newline';

export interface ProofingSession {
  id: string;
  client_name: string;
  drive_folder_url: string;
  drive_folder_id: string;
  max_quota: number;
  pin_code: string;
  expires_at: string; // YYYY-MM-DD
  status: SessionStatus;
  created_at: string;
}

export interface PhotoSelection {
  id: string;
  session_id: string;
  file_id: string;
  file_name: string;
  thumbnail_url: string;
  selected_at: string;
}

export interface StudioTask {
  id: string;
  title: string;
  notes: string;
  session_id: string | null;
  due_date: string | null; // YYYY-MM-DD | null
  status: TaskStatus;
  created_at: string;
}

export interface StudioSchedule {
  id: string;
  title: string;
  client_name: string;
  event_type: ScheduleEventType;
  shoot_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  location: string;
  photographer: string;
  session_id: string | null;
  status: ScheduleStatus;
  notes: string;
  created_at: string;
}

export interface DrivePhoto {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink: string;
  previewUrl: string;
  caption?: string;
  source: 'google_drive' | 'simulation';
}

export interface SessionInput {
  client_name: string;
  drive_folder_url: string;
  max_quota: number;
  pin_code: string;
  expires_at: string;
  status: SessionStatus;
}

export interface TaskInput {
  title: string;
  notes: string;
  session_id: string | null;
  due_date: string | null;
  status?: TaskStatus;
}

export interface ScheduleInput {
  title: string;
  client_name: string;
  event_type: ScheduleEventType;
  shoot_date: string;
  start_time: string;
  end_time: string;
  location: string;
  photographer: string;
  session_id: string | null;
  status: ScheduleStatus;
  notes: string;
}

export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: TeamRole;
  job_title: string;
  phone: string;
  bio: string;
  is_active: boolean;
  created_at: string;
}

export interface StoredTeamMemberRecord extends TeamMember {
  password_hash: string;
}

export interface TeamMemberInput {
  full_name: string;
  email: string;
  role: TeamRole;
  job_title: string;
  phone: string;
  bio: string;
  is_active: boolean;
  password?: string;
}

export interface ProfileUpdateInput {
  full_name: string;
  email: string;
  job_title: string;
  phone: string;
  bio: string;
}

export interface RegisterAccountInput {
  full_name: string;
  email: string;
  job_title: string;
  phone: string;
  password: string;
  confirm_password: string;
}
