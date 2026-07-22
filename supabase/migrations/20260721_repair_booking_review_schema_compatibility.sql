-- Repair booking/review schema compatibility for an already partially initialized production database.
-- This migration is idempotent and avoids dependency on tables or columns that may not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_profile_edits'
      AND column_name = 'master_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_profile_edits'
      AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.master_profile_edits
      ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS master_profile_edits_owner_id_idx
  ON public.master_profile_edits(owner_id);

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS confirmed_period jsonb;

CREATE INDEX IF NOT EXISTS requests_client_created_idx
  ON public.requests(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS requests_master_created_idx
  ON public.requests(master_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_access_booking(booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = booking_id
      AND (
        r.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.master_profile_edits p
          WHERE p.master_id = r.master_id
            AND p.owner_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_booking(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_booking(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  master_id text NOT NULL,
  client_id uuid NOT NULL,
  client_public_name text NOT NULL DEFAULT '',
  service_title text,
  project_id uuid,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality_rating smallint CHECK (quality_rating BETWEEN 1 AND 5),
  deadlines_rating smallint CHECK (deadlines_rating BETWEEN 1 AND 5),
  communication_rating smallint CHECK (communication_rating BETWEEN 1 AND 5),
  estimate_rating smallint CHECK (estimate_rating BETWEEN 1 AND 5),
  cleanliness_rating smallint CHECK (cleanliness_rating BETWEEN 1 AND 5),
  text text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending', 'hidden')),
  master_reply text,
  master_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'booking_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'reviews'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.requests(id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.reviews
      ADD COLUMN booking_id uuid;
  END IF;
END$$;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS master_id text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS client_public_name text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS service_title text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rating smallint;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS quality_rating smallint;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS deadlines_rating smallint;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS communication_rating smallint;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS estimate_rating smallint;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS cleanliness_rating smallint;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS image_urls text[];
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS master_reply text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS master_replied_at timestamptz;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_id_key
  ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS reviews_master_published_idx
  ON public.reviews(master_id, created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS reviews_client_idx
  ON public.reviews(client_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.reply_to_review(review_id uuid, reply_text text)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.reviews;
BEGIN
  IF char_length(trim(reply_text)) NOT BETWEEN 2 AND 2000 THEN
    RAISE EXCEPTION 'Некоректна довжина відповіді';
  END IF;

  SELECT * INTO target FROM public.reviews WHERE id = review_id;
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Відгук не знайдено';
  END IF;
  IF target.master_reply IS NOT NULL THEN
    RAISE EXCEPTION 'Відповідь уже додано';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.master_profile_edits profile
    WHERE profile.master_id = target.master_id
      AND profile.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Недостатньо прав';
  END IF;

  UPDATE public.reviews
  SET master_reply = trim(reply_text), master_replied_at = now(), updated_at = now()
  WHERE id = review_id
  RETURNING * INTO target;

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_review(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reply_to_review(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.booking_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  kind text NOT NULL CHECK (kind IN ('image', 'document')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS original_name text;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS size_bytes bigint;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.booking_attachments
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_attachments'
      AND column_name = 'booking_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'booking_attachments'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.booking_attachments
      ADD CONSTRAINT booking_attachments_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.requests(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS booking_attachments_storage_path_key
  ON public.booking_attachments(storage_path);
CREATE INDEX IF NOT EXISTS booking_attachments_booking_idx
  ON public.booking_attachments(booking_id, created_at);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-attachments', 'booking-attachments', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published reviews are public" ON public.reviews;
CREATE POLICY "Published reviews are public"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Clients can read own reviews" ON public.reviews;
CREATE POLICY "Clients can read own reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients review own completed bookings" ON public.reviews;
CREATE POLICY "Clients review own completed bookings"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND status IN ('published', 'pending')
    AND master_reply IS NULL
    AND master_replied_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.requests request
      WHERE request.id = booking_id
        AND request.client_id = auth.uid()
        AND request.master_id = master_id
        AND request.status = 'completed'
    )
  );

REVOKE UPDATE, DELETE ON public.reviews FROM anon, authenticated;

ALTER TABLE public.booking_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants read attachments" ON public.booking_attachments;
CREATE POLICY "Booking participants read attachments"
  ON public.booking_attachments
  FOR SELECT
  TO authenticated
  USING (public.can_access_booking(booking_id));

DROP POLICY IF EXISTS "Booking participants insert attachments" ON public.booking_attachments;
CREATE POLICY "Booking participants insert attachments"
  ON public.booking_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = booking_id
        AND public.can_access_booking(r.id)
    )
  );

DROP POLICY IF EXISTS "Uploaders delete own booking attachments" ON public.booking_attachments;
CREATE POLICY "Uploaders delete own booking attachments"
  ON public.booking_attachments
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Booking participants upload booking files" ON storage.objects;
CREATE POLICY "Booking participants upload booking files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'booking-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND public.can_access_booking(r.id)
    )
  );

DROP POLICY IF EXISTS "Booking participants read files" ON storage.objects;
CREATE POLICY "Booking participants read files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'booking-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND public.can_access_booking(r.id)
    )
  );

DROP POLICY IF EXISTS "Booking participants delete files" ON storage.objects;
CREATE POLICY "Booking participants delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'booking-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND public.can_access_booking(r.id)
    )
  );
