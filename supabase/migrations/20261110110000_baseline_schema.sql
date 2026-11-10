-- Baseline of the hosted Supabase schema as it actually exists in production.
-- The previous 20260501172718 migration described columns that never existed
-- there (local_timestamp, frames), so it was replaced by this file.

CREATE TABLE IF NOT EXISTS public.raw_manual_configs (
  local_id text NOT NULL,
  name text NOT NULL,
  raw_landmarks jsonb NOT NULL,
  is_packaged boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  learning_tips jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT raw_manual_configs_pkey PRIMARY KEY (local_id)
);

CREATE TABLE IF NOT EXISTS public.raw_signs (
  local_id text NOT NULL,
  dominant_config_id text,
  recessive_config_id text,
  meanings jsonb NOT NULL,
  raw_frames jsonb NOT NULL,
  is_packaged boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  learning_tips jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT raw_signs_pkey PRIMARY KEY (local_id),
  CONSTRAINT raw_signs_dominant_config_id_fkey FOREIGN KEY (dominant_config_id) REFERENCES public.raw_manual_configs(local_id),
  CONSTRAINT raw_signs_recessive_config_id_fkey FOREIGN KEY (recessive_config_id) REFERENCES public.raw_manual_configs(local_id)
);

CREATE TABLE IF NOT EXISTS public.app_manual_configs (
  id text NOT NULL,
  name text NOT NULL,
  vector_data text NOT NULL,
  raw_source_id text,
  learning_tips jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT app_manual_configs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_signs (
  id text NOT NULL,
  meanings jsonb NOT NULL,
  dominant_config_id text,
  recessive_config_id text,
  animation_filename text NOT NULL,
  raw_source_id text,
  learning_tips jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT app_signs_pkey PRIMARY KEY (id),
  CONSTRAINT app_signs_dominant_config_id_fkey FOREIGN KEY (dominant_config_id) REFERENCES public.app_manual_configs(id),
  CONSTRAINT app_signs_recessive_config_id_fkey FOREIGN KEY (recessive_config_id) REFERENCES public.app_manual_configs(id)
);

CREATE TABLE IF NOT EXISTS public.phrases (
  id text NOT NULL,
  spanish_translation text NOT NULL,
  lsv_gloss text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT phrases_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.phrase_signs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phrase_id text NOT NULL,
  sign_id text NOT NULL,
  order_index integer NOT NULL,
  CONSTRAINT phrase_signs_pkey PRIMARY KEY (id),
  CONSTRAINT phrase_signs_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrases(id)
);

CREATE TABLE IF NOT EXISTS public.modules (
  id text NOT NULL,
  title text NOT NULL,
  description text,
  difficulty_level integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT modules_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.module_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id text NOT NULL,
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['config'::text, 'sign'::text, 'phrase'::text])),
  sign_id text,
  phrase_id text,
  order_index integer NOT NULL,
  config_id text,
  CONSTRAINT module_items_pkey PRIMARY KEY (id),
  CONSTRAINT module_items_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id),
  CONSTRAINT module_items_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrases(id)
);

-- Writes come from the Studio export, which always runs after a password sign-in.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'raw_manual_configs', 'raw_signs', 'app_manual_configs', 'app_signs',
    'phrases', 'phrase_signs', 'modules', 'module_items'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated write" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "authenticated write" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- Baked animations are uploaded as JSON files instead of rows, and the learner
-- build downloads them from here using app_signs.animation_filename.
INSERT INTO storage.buckets (id, name, public)
VALUES ('animations', 'animations', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated write animations" ON storage.objects;
CREATE POLICY "authenticated write animations" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'animations')
  WITH CHECK (bucket_id = 'animations');
