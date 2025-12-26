import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, NewProject } from "@/lib/db/schema";

interface ProjectsState {
  // Projects data
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  // Modal states
  isAddProjectModalOpen: boolean;
  isEditProjectModalOpen: boolean;
  selectedProject: Project | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: Omit<NewProject, "userId">) => Promise<void>;
  updateProject: (id: string, data: Partial<Omit<NewProject, "userId">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  reorderProjects: (orderedIds: string[]) => Promise<void>;

  // Modal actions
  openAddProjectModal: () => void;
  closeAddProjectModal: () => void;
  openEditProjectModal: (project: Project) => void;
  closeEditProjectModal: () => void;

  // Internal state management
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProjectLocal: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setError: (error: string | null) => void;

  // Getters/Selectors
  getActiveProject: () => Project | null;
  getDefaultProject: () => Project | null;
  getProjectById: (id: string) => Project | undefined;
  getProjectCount: () => number;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      activeProjectId: null,
      isLoading: false,
      error: null,

      // Modal states
      isAddProjectModalOpen: false,
      isEditProjectModalOpen: false,
      selectedProject: null,

      // Fetch all projects
      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/projects");

          if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
          }

          const projects: Project[] = await response.json();

          // Sort projects by order
          const sortedProjects = projects.sort((a, b) => a.order - b.order);

          set({ projects: sortedProjects, isLoading: false });

          // Note: We don't auto-select a project here.
          // activeProjectId = null means "Home view" which is a valid state.
          // The user must explicitly select a project.
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch projects";
          console.error("Error fetching projects:", error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Create new project
      createProject: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`Failed to create project: ${response.statusText}`);
          }

          const newProject: Project = await response.json();

          set((state) => ({
            projects: [...state.projects, newProject].sort((a, b) => a.order - b.order),
            isLoading: false,
          }));

          console.log("Project created:", newProject);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to create project";
          console.error("Error creating project:", error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Update existing project
      updateProject: async (id, data) => {
        set({ error: null });

        // Optimistic update
        const originalProjects = get().projects;
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...data, updatedAt: new Date() } : project
          ),
        }));

        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            // Revert optimistic update on error
            set({ projects: originalProjects });
            throw new Error(`Failed to update project: ${response.statusText}`);
          }

          const updatedProject: Project = await response.json();

          set((state) => ({
            projects: state.projects.map((project) =>
              project.id === id ? updatedProject : project
            ),
          }));

          console.log("Project updated:", updatedProject);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to update project";
          console.error("Error updating project:", error);
          set({ error: errorMessage });
        }
      },

      // Delete project
      deleteProject: async (id) => {
        set({ error: null });

        // Optimistic update
        const originalProjects = get().projects;
        const originalActiveId = get().activeProjectId;

        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          // If deleting active project, switch to Home (null)
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));

        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            // Revert optimistic update on error
            set({ projects: originalProjects, activeProjectId: originalActiveId });
            throw new Error(`Failed to delete project: ${response.statusText}`);
          }

          console.log("Project deleted:", id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to delete project";
          console.error("Error deleting project:", error);
          set({ error: errorMessage });
        }
      },

      // Set active project (persisted to localStorage)
      setActiveProject: (id) => {
        set({ activeProjectId: id });
        console.log("Active project changed:", id || "Home");
      },

      // Reorder projects
      reorderProjects: async (orderedIds) => {
        set({ error: null });

        // Optimistic update - reorder projects based on orderedIds
        const originalProjects = get().projects;
        const reorderedProjects = orderedIds.map((id, index) => {
          const project = get().projects.find(p => p.id === id);
          return project ? { ...project, order: index } : null;
        }).filter((p): p is Project => p !== null);

        set({ projects: reorderedProjects });

        try {
          const response = await fetch("/api/projects/reorder", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderedIds }),
          });

          if (!response.ok) {
            // Revert optimistic update on error
            set({ projects: originalProjects });
            throw new Error(`Failed to reorder projects: ${response.statusText}`);
          }

          const updatedProjects: Project[] = await response.json();
          set({ projects: updatedProjects });

          console.log("Projects reordered:", orderedIds.length, "items");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to reorder projects";
          console.error("Error reordering projects:", error);
          set({ error: errorMessage });
        }
      },

      // Internal state management
      setProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project].sort((a, b) => a.order - b.order),
        })),

      updateProjectLocal: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates } : project
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
        })),

      setError: (error) => set({ error }),

      // Getters/Selectors
      getActiveProject: () => {
        const state = get();
        if (!state.activeProjectId) return null;
        return state.projects.find(p => p.id === state.activeProjectId) || null;
      },

      getDefaultProject: () => {
        const state = get();
        return state.projects.find(p => p.isDefault) || null;
      },

      getProjectById: (id) => {
        return get().projects.find(p => p.id === id);
      },

      getProjectCount: () => {
        return get().projects.length;
      },

      // Modal actions
      openAddProjectModal: () => set({ isAddProjectModalOpen: true }),
      closeAddProjectModal: () => set({ isAddProjectModalOpen: false }),

      openEditProjectModal: (project) => {
        set({
          selectedProject: project,
          isEditProjectModalOpen: true,
        });
      },

      closeEditProjectModal: () => {
        set({
          selectedProject: null,
          isEditProjectModalOpen: false,
        });
      },
    }),
    {
      name: "stacklume-active-project",
      // Only persist the activeProjectId to localStorage
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);

// Helper hook to get active project
export function useActiveProject(): Project | null {
  return useProjectsStore((state) => state.getActiveProject());
}

// Helper hook to get default project
export function useDefaultProject(): Project | null {
  return useProjectsStore((state) => state.getDefaultProject());
}

// Helper hook to get a specific project
export function useProject(id: string): Project | undefined {
  return useProjectsStore((state) => state.getProjectById(id));
}

// Helper hook to check if a project is active
export function useIsProjectActive(id: string): boolean {
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  return activeProjectId === id;
}

// Helper hook to check if viewing Home (no active project)
export function useIsHome(): boolean {
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  return activeProjectId === null;
}
