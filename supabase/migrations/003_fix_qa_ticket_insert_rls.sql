-- Fix QA ticket creation failing with "new row violates row-level security policy".
--
-- tickets_select used can_access_ticket(id), which reads from tickets inside a
-- tickets SELECT policy and can fail on INSERT ... RETURNING (PostgREST .select()).
-- Use is_project_member(project_id) on the row instead.

CREATE OR REPLACE FUNCTION public.is_qa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'qa'::public.user_role
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_create_ticket(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR (
      public.is_project_member(p_project_id)
      AND public.is_qa()
    );
$$;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;

CREATE POLICY "tickets_select"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;

CREATE POLICY "tickets_insert"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_create_ticket(project_id)
    AND created_by = auth.uid()
    AND (
      assignee_id IS NULL
      OR public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.project_members pm
        WHERE pm.project_id = project_id
          AND pm.user_id = assignee_id
      )
    )
  );

GRANT EXECUTE ON FUNCTION public.is_qa() TO authenticated;
