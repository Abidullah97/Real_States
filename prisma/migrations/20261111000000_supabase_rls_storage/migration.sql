-- Supabase exposes every table in the "public" schema through its REST/GraphQL Data API, reachable with the
-- publishable (anon) key. This app never uses that API: all data access goes through Prisma on the server,
-- connected as the table owner, which bypasses row level security. Enabling RLS with no policies therefore
-- blocks the public Data API completely (no reads, no writes) without affecting the application.
-- Safe on plain PostgreSQL too. Re-run the same statement for any table added by a later migration.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Supabase Storage bucket for listing, site and avatar images (only on Supabase, where the storage schema exists).
-- Public read so images can be shown on the website; uploads and deletes are done only by the server with the
-- secret key. No storage policies are created, so the publishable key cannot upload, change or delete files.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
