-- Add optional start and due dates to tickets

ALTER TABLE public.tickets
  ADD COLUMN start_date date,
  ADD COLUMN due_date date;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_dates_valid
  CHECK (
    start_date IS NULL
    OR due_date IS NULL
    OR start_date <= due_date
  );

CREATE INDEX idx_tickets_due_date ON public.tickets (due_date)
  WHERE due_date IS NOT NULL;

-- Log start/due date changes in activity
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

    IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN
      INSERT INTO public.activity_log (ticket_id, user_id, action, meta)
      VALUES (
        NEW.id,
        v_user_id,
        'start_date_changed',
        jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date)
      );
    END IF;

    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.activity_log (ticket_id, user_id, action, meta)
      VALUES (
        NEW.id,
        v_user_id,
        'due_date_changed',
        jsonb_build_object('from', OLD.due_date, 'to', NEW.due_date)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
