"use client";

import { createContext, useContext } from "react";

import type { Profile, Project } from "@/types/database";

export type ProjectContextValue = {
  project: Project;
  profile: Profile;
  canCreateTickets: boolean;
  members: Pick<Profile, "id" | "name" | "email" | "role">[];
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  value,
  children,
}: {
  value: ProjectContextValue;
  children: React.ReactNode;
}) {
  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return ctx;
}
