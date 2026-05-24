-- Ticket description image storage
-- Path convention: {project_id}/{ticket_id|draft}/{uuid}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-images',
  'ticket-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.ticket_image_project_id(object_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_path, '/', 1), '')::uuid;
$$;

CREATE POLICY "ticket_images_select"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'ticket-images');

CREATE POLICY "ticket_images_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-images'
    AND public.ticket_image_project_id(name) IS NOT NULL
    AND public.is_project_member(public.ticket_image_project_id(name))
  );

CREATE POLICY "ticket_images_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ticket-images'
    AND public.ticket_image_project_id(name) IS NOT NULL
    AND public.is_project_member(public.ticket_image_project_id(name))
  )
  WITH CHECK (
    bucket_id = 'ticket-images'
    AND public.ticket_image_project_id(name) IS NOT NULL
    AND public.is_project_member(public.ticket_image_project_id(name))
  );

CREATE POLICY "ticket_images_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ticket-images'
    AND public.ticket_image_project_id(name) IS NOT NULL
    AND public.is_project_member(public.ticket_image_project_id(name))
  );
