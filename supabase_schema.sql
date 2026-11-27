-- Lumina Proof: Client Proofing System Database Schema (Supabase / PostgreSQL)
-- Jalankan script ini di Supabase SQL Editor sebelum menghubungkan aplikasi ke production.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel Sesi Galeri Klien
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  drive_folder_url TEXT NOT NULL,
  drive_folder_id TEXT NOT NULL,
  max_quota INT NOT NULL CHECK (max_quota > 0),
  pin_code TEXT NOT NULL CHECK (char_length(pin_code) BETWEEN 4 AND 6),
  expires_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Foto Terpilih oleh Klien
CREATE TABLE IF NOT EXISTS public.selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, file_id)
);

-- Indeks untuk query monitoring real-time yang cepat
CREATE INDEX IF NOT EXISTS idx_selections_session_id ON public.selections(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;

-- Policy dasar untuk akses client proofing berbasis session ID & admin studio
-- Catatan: Untuk keamanan studio produksi penuh, gunakan Supabase Auth untuk operasi Admin (INSERT/DELETE sessions).
CREATE POLICY "Allow public read sessions"
  ON public.sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Allow studio session mutations"
  ON public.sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read selections"
  ON public.selections
  FOR SELECT
  USING (true);

CREATE POLICY "Allow client selection mutations"
  ON public.selections
  FOR ALL
  USING (true)
  WITH CHECK (true);
