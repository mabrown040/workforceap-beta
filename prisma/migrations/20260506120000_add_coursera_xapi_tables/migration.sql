-- Coursera xAPI identity + event tables (kept compatible with legacy runtime bootstrap in lib/xapi/mappings.ts).
-- IF NOT EXISTS allows databases that already created these tables at runtime.

CREATE TABLE IF NOT EXISTS coursera_identity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coursera_email TEXT,
    actor_identifier TEXT,
    actor_home_page TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    created_by_user_id TEXT,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT coursera_identity_mappings_identity_check CHECK (
      coursera_email IS NOT NULL OR actor_identifier IS NOT NULL
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS coursera_identity_mappings_email_key
  ON coursera_identity_mappings (LOWER(coursera_email))
  WHERE coursera_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coursera_identity_mappings_actor_key
  ON coursera_identity_mappings (actor_identifier, COALESCE(actor_home_page, ''))
  WHERE actor_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS coursera_identity_mappings_user_id_idx
  ON coursera_identity_mappings (user_id);

CREATE TABLE IF NOT EXISTS coursera_xapi_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id TEXT UNIQUE,
    actor_email TEXT,
    actor_identifier TEXT,
    actor_home_page TEXT,
    course_slug TEXT,
    course_name TEXT,
    verb_id TEXT,
    matched_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    mapping_method TEXT,
    completion_status TEXT NOT NULL DEFAULT 'received',
    error TEXT,
    raw_payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coursera_xapi_events_actor_email_idx
  ON coursera_xapi_events (LOWER(actor_email));

CREATE INDEX IF NOT EXISTS coursera_xapi_events_status_idx
  ON coursera_xapi_events (completion_status, received_at DESC);
