-- Trackly initial schema
-- Run via: supabase db reset / supabase migration up

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('admin', 'qa', 'engineer');

CREATE TYPE public.ticket_type AS ENUM ('bug', 'feature', 'task', 'improvement');

CREATE TYPE public.ticket_status AS ENUM (
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'testing',
  'done'
);

CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'engineer',
  is_active boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user_id ON public.project_members (user_id);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number integer NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 150 AND char_length(title) > 0),
  description text,
  type public.ticket_type NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'backlog',
  priority public.ticket_priority NOT NULL,
  assignee_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, ticket_number)
);

CREATE INDEX idx_tickets_project_id ON public.tickets (project_id);
CREATE INDEX idx_tickets_assignee_id ON public.tickets (assignee_id);
CREATE INDEX idx_tickets_status ON public.tickets (status);

CREATE TABLE public.ticket_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) > 0),
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX idx_ticket_labels_project_id ON public.ticket_labels (project_id);

CREATE TABLE public.ticket_label_map (
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.ticket_labels (id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, label_id)
);

CREATE INDEX idx_ticket_label_map_label_id ON public.ticket_label_map (label_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_ticket_id ON public.comments (ticket_id);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_ticket_id ON public.activity_log (ticket_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER for RLS checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      JOIN public.profiles p ON p.id = pm.user_id
      WHERE pm.project_id = p_project_id
        AND pm.user_id = auth.uid()
        AND p.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_ticket(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.tickets t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      JOIN public.profiles p ON p.id = pm.user_id
      WHERE t.id = p_ticket_id
        AND pm.user_id = auth.uid()
        AND p.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.shares_project_with(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm1
    INNER JOIN public.project_members pm2
      ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid()
      AND pm2.user_id = p_other_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

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

-- ---------------------------------------------------------------------------
-- Ticket number & updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

  SELECT COALESCE(MAX(ticket_number), 0) + 1
  INTO NEW.ticket_number
  FROM public.tickets
  WHERE project_id = NEW.project_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_number();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_set_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth → profile sync
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Activity log triggers (status, assignee, priority)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_ticket_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.activity_log (ticket_id, user_id, action, meta)
      VALUES (
        NEW.id,
        v_user_id,
        'status_changed',
        jsonb_build_object('from', OLD.status, 'to', NEW.status)
      );
    END IF;

    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO public.activity_log (ticket_id, user_id, action, meta)
      VALUES (
        NEW.id,
        v_user_id,
        'assignee_changed',
        jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id)
      );
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.activity_log (ticket_id, user_id, action, meta)
      VALUES (
        NEW.id,
        v_user_id,
        'priority_changed',
        jsonb_build_object('from', OLD.priority, 'to', NEW.priority)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_log_activity
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_activity();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_label_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- profiles ------------------------------------------------------------------

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "profiles_select_project_peers"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.shares_project_with(id));

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- projects ------------------------------------------------------------------

CREATE POLICY "projects_select_member_or_admin"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_member(id)
  );

CREATE POLICY "projects_insert_admin"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_update_admin"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_delete_admin"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- project_members -----------------------------------------------------------

CREATE POLICY "project_members_select"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "project_members_insert_admin"
  ON public.project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "project_members_delete_admin"
  ON public.project_members
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- tickets -------------------------------------------------------------------

CREATE POLICY "tickets_select"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_member(project_id)
  );

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

CREATE POLICY "tickets_update"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (public.can_access_ticket(id))
  WITH CHECK (public.can_access_ticket(id));

CREATE POLICY "tickets_delete_admin"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ticket_labels -------------------------------------------------------------

CREATE POLICY "ticket_labels_select"
  ON public.ticket_labels
  FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "ticket_labels_insert"
  ON public.ticket_labels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_member(project_id)
    AND (public.is_admin() OR public.current_user_role() = 'qa')
  );

CREATE POLICY "ticket_labels_update"
  ON public.ticket_labels
  FOR UPDATE
  TO authenticated
  USING (public.is_project_member(project_id))
  WITH CHECK (
    public.is_project_member(project_id)
    AND (public.is_admin() OR public.current_user_role() = 'qa')
  );

CREATE POLICY "ticket_labels_delete"
  ON public.ticket_labels
  FOR DELETE
  TO authenticated
  USING (
    public.is_project_member(project_id)
    AND (public.is_admin() OR public.current_user_role() = 'qa')
  );

-- ticket_label_map ----------------------------------------------------------

CREATE POLICY "ticket_label_map_select"
  ON public.ticket_label_map
  FOR SELECT
  TO authenticated
  USING (public.can_access_ticket(ticket_id));

CREATE POLICY "ticket_label_map_insert"
  ON public.ticket_label_map
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_ticket(ticket_id));

CREATE POLICY "ticket_label_map_delete"
  ON public.ticket_label_map
  FOR DELETE
  TO authenticated
  USING (public.can_access_ticket(ticket_id));

-- comments ------------------------------------------------------------------

CREATE POLICY "comments_select"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (public.can_access_ticket(ticket_id));

CREATE POLICY "comments_insert"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_ticket(ticket_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "comments_update_own"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.can_access_ticket(ticket_id))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_delete_own_or_admin"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_ticket(ticket_id)
    AND (user_id = auth.uid() OR public.is_admin())
  );

-- activity_log --------------------------------------------------------------

CREATE POLICY "activity_log_select"
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (public.can_access_ticket(ticket_id));

CREATE POLICY "activity_log_insert"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_ticket(ticket_id));

-- push_subscriptions --------------------------------------------------------

CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update_own"
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_qa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_project_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_ticket(uuid) TO authenticated;
