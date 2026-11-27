-- ============================================================================
-- Lumina Proof: Client Proofing System — Supabase PostgreSQL Schema
-- Jalankan seluruh script ini di Supabase SQL Editor.
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tables
-- ----------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, file_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  session_id UUID NULL REFERENCES public.sessions(id) ON DELETE SET NULL,
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'wedding' CHECK (event_type IN ('wedding', 'prewedding', 'portrait', 'commercial', 'event', 'other')),
  shoot_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  photographer TEXT NOT NULL DEFAULT '',
  session_id UUID NULL REFERENCES public.sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  job_title TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_selections_session_id
  ON public.selections (session_id);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at
  ON public.sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_status_due
  ON public.tasks (status, due_date);

CREATE INDEX IF NOT EXISTS idx_schedules_shoot_date
  ON public.schedules (shoot_date ASC, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_team_members_email
  ON public.team_members (lower(email));

-- 4. Role Permissions (PostgREST: anon & authenticated)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.selections TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.schedules TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_members TO anon, authenticated;

-- 5. Row Level Security (RLS) & Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow studio session mutations" ON public.sessions;

CREATE POLICY "Allow public read sessions"
  ON public.sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow studio session mutations"
  ON public.sessions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read selections" ON public.selections;
DROP POLICY IF EXISTS "Allow client selection mutations" ON public.selections;

CREATE POLICY "Allow public read selections"
  ON public.selections
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow client selection mutations"
  ON public.selections
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow studio tasks access" ON public.tasks;

CREATE POLICY "Allow studio tasks access"
  ON public.tasks
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow studio schedules access" ON public.schedules;

CREATE POLICY "Allow studio schedules access"
  ON public.schedules
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow studio team members access" ON public.team_members;

CREATE POLICY "Allow studio team members access"
  ON public.team_members
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Reload PostgREST Schema Cache
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
