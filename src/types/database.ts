export type UserRole = "admin" | "qa" | "engineer";

export type TicketType = "bug" | "feature" | "task" | "improvement";

export type TicketStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "testing"
  | "done";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  push_enabled: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: number;
  project_id: string;
  title: string;
  description: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TicketLabel {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TicketLabelMap {
  ticket_id: string;
  label_id: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  ticket_id: string;
  user_id: string | null;
  action: string;
  meta: Json;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
}

export type ProfileInsert = Pick<Profile, "id" | "name" | "email"> &
  Partial<Pick<Profile, "role" | "is_active" | "push_enabled">>;

export type ProfileUpdate = Partial<
  Pick<Profile, "name" | "email" | "role" | "is_active" | "push_enabled">
>;

export type ProjectInsert = Pick<Project, "name" | "slug"> &
  Partial<Pick<Project, "description" | "is_archived">>;

export type ProjectUpdate = Partial<
  Pick<Project, "name" | "slug" | "description" | "is_archived">
>;

export type ProjectMemberInsert = Pick<ProjectMember, "project_id" | "user_id">;

/** ticket_number is assigned by DB trigger; do not send on insert */
export type TicketInsert = Pick<
  Ticket,
  "project_id" | "title" | "type" | "priority" | "created_by"
> &
  Partial<
    Pick<
      Ticket,
      "description" | "status" | "assignee_id" | "start_date" | "due_date"
    >
  >;

export type TicketUpdate = Partial<
  Pick<
    Ticket,
    | "title"
    | "description"
    | "type"
    | "status"
    | "priority"
    | "assignee_id"
    | "start_date"
    | "due_date"
  >
>;

export type TicketLabelInsert = Pick<TicketLabel, "project_id" | "name"> &
  Partial<Pick<TicketLabel, "color">>;

export type TicketLabelUpdate = Partial<Pick<TicketLabel, "name" | "color">>;

export type TicketLabelMapInsert = TicketLabelMap;

export type CommentInsert = Pick<Comment, "ticket_id" | "user_id" | "body">;

export type CommentUpdate = Partial<Pick<Comment, "body">>;

export type ActivityLogInsert = Pick<ActivityLog, "ticket_id" | "action"> &
  Partial<Pick<ActivityLog, "user_id" | "meta">>;

export type PushSubscriptionInsert = Pick<
  PushSubscription,
  "user_id" | "endpoint" | "p256dh" | "auth_key"
>;

export type PushSubscriptionUpdate = Partial<
  Pick<PushSubscription, "endpoint" | "p256dh" | "auth_key">
>;

/** Assignee dropdown / peer profile fields exposed via RLS */
export type ProfilePublic = Pick<
  Profile,
  "id" | "name" | "email" | "role" | "is_active"
>;

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, ProfileInsert, ProfileUpdate>;
      projects: TableDef<Project, ProjectInsert, ProjectUpdate>;
      project_members: TableDef<
        ProjectMember,
        ProjectMemberInsert,
        Partial<ProjectMemberInsert>
      >;
      tickets: TableDef<Ticket, TicketInsert, TicketUpdate>;
      ticket_labels: TableDef<
        TicketLabel,
        TicketLabelInsert,
        TicketLabelUpdate
      >;
      ticket_label_map: TableDef<
        TicketLabelMap,
        TicketLabelMapInsert,
        Partial<TicketLabelMapInsert>
      >;
      comments: TableDef<Comment, CommentInsert, CommentUpdate>;
      activity_log: TableDef<
        ActivityLog,
        ActivityLogInsert,
        Partial<ActivityLogInsert>
      >;
      push_subscriptions: TableDef<
        PushSubscription,
        PushSubscriptionInsert,
        PushSubscriptionUpdate
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      ticket_type: TicketType;
      ticket_status: TicketStatus;
      ticket_priority: TicketPriority;
    };
    CompositeTypes: Record<string, never>;
  };
}
