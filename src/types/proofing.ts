export type SessionStatus = 'draft' | 'active' | 'submitted';

export type FilenameExportFormat = 'comma' | 'space' | 'newline';

export type AppViewMode = 'admin' | 'client';

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
