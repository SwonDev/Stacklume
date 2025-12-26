/**
 * Projects Store Tests
 *
 * Tests for the project/workspace management store
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useProjectsStore } from '../projects-store';
import type { Project } from '@/lib/db/schema';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create mock project
const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: 'project-1',
  userId: null,
  name: 'Test Project',
  description: null,
  icon: null,
  color: null,
  order: 0,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

// Cleanup function to reset store
const cleanupStore = () => {
  useProjectsStore.setState({
    projects: [],
    activeProjectId: null,
    isLoading: false,
    error: null,
    isAddProjectModalOpen: false,
    isEditProjectModalOpen: false,
    selectedProject: null,
  });
};

describe('Projects Store', () => {
  beforeEach(() => {
    cleanupStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupStore();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty projects array', () => {
      const { projects } = useProjectsStore.getState();
      expect(projects).toEqual([]);
    });

    it('should initialize with no active project', () => {
      const { activeProjectId } = useProjectsStore.getState();
      expect(activeProjectId).toBeNull();
    });

    it('should initialize with modals closed', () => {
      const state = useProjectsStore.getState();
      expect(state.isAddProjectModalOpen).toBe(false);
      expect(state.isEditProjectModalOpen).toBe(false);
      expect(state.selectedProject).toBeNull();
    });

    it('should initialize with no error', () => {
      const { error } = useProjectsStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('Projects Management', () => {
    it('should set projects', () => {
      const projects = [
        createMockProject({ id: 'p1', name: 'Project 1', order: 0 }),
        createMockProject({ id: 'p2', name: 'Project 2', order: 1 }),
      ];

      useProjectsStore.getState().setProjects(projects);

      const state = useProjectsStore.getState();
      expect(state.projects).toHaveLength(2);
      expect(state.projects[0].name).toBe('Project 1');
    });

    it('should add project and sort by order', () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1', order: 1 })],
      });

      const newProject = createMockProject({ id: 'p2', name: 'New', order: 0 });
      useProjectsStore.getState().addProject(newProject);

      const { projects } = useProjectsStore.getState();
      expect(projects).toHaveLength(2);
      // Should be sorted by order
      expect(projects[0].order).toBe(0);
      expect(projects[1].order).toBe(1);
    });

    it('should update project locally', () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1', name: 'Original' })],
      });

      useProjectsStore.getState().updateProjectLocal('p1', { name: 'Updated' });

      const { projects } = useProjectsStore.getState();
      expect(projects[0].name).toBe('Updated');
    });

    it('should remove project', () => {
      useProjectsStore.setState({
        projects: [
          createMockProject({ id: 'p1' }),
          createMockProject({ id: 'p2' }),
        ],
      });

      useProjectsStore.getState().removeProject('p1');

      const { projects } = useProjectsStore.getState();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('p2');
    });
  });

  describe('Active Project', () => {
    it('should set active project', () => {
      useProjectsStore.getState().setActiveProject('project-1');
      expect(useProjectsStore.getState().activeProjectId).toBe('project-1');
    });

    it('should set active project to null (Home)', () => {
      useProjectsStore.getState().setActiveProject('project-1');
      useProjectsStore.getState().setActiveProject(null);
      expect(useProjectsStore.getState().activeProjectId).toBeNull();
    });

    it('should get active project', () => {
      const project = createMockProject({ id: 'p1', name: 'Active' });
      useProjectsStore.setState({
        projects: [project],
        activeProjectId: 'p1',
      });

      const activeProject = useProjectsStore.getState().getActiveProject();
      expect(activeProject?.name).toBe('Active');
    });

    it('should return null when no active project', () => {
      const activeProject = useProjectsStore.getState().getActiveProject();
      expect(activeProject).toBeNull();
    });

    it('should return null when active project not found', () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1' })],
        activeProjectId: 'non-existent',
      });

      const activeProject = useProjectsStore.getState().getActiveProject();
      expect(activeProject).toBeNull();
    });
  });

  describe('Default Project', () => {
    it('should get default project', () => {
      useProjectsStore.setState({
        projects: [
          createMockProject({ id: 'p1', isDefault: false }),
          createMockProject({ id: 'p2', isDefault: true, name: 'Default' }),
        ],
      });

      const defaultProject = useProjectsStore.getState().getDefaultProject();
      expect(defaultProject?.name).toBe('Default');
    });

    it('should return null when no default project', () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1', isDefault: false })],
      });

      const defaultProject = useProjectsStore.getState().getDefaultProject();
      expect(defaultProject).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should get project by id', () => {
      useProjectsStore.setState({
        projects: [
          createMockProject({ id: 'p1', name: 'Project 1' }),
          createMockProject({ id: 'p2', name: 'Project 2' }),
        ],
      });

      const project = useProjectsStore.getState().getProjectById('p2');
      expect(project?.name).toBe('Project 2');
    });

    it('should return undefined for non-existent project', () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1' })],
      });

      const project = useProjectsStore.getState().getProjectById('non-existent');
      expect(project).toBeUndefined();
    });

    it('should get project count', () => {
      useProjectsStore.setState({
        projects: [
          createMockProject({ id: 'p1' }),
          createMockProject({ id: 'p2' }),
          createMockProject({ id: 'p3' }),
        ],
      });

      const count = useProjectsStore.getState().getProjectCount();
      expect(count).toBe(3);
    });

    it('should return 0 for empty projects', () => {
      const count = useProjectsStore.getState().getProjectCount();
      expect(count).toBe(0);
    });
  });

  describe('Modal States', () => {
    it('should open add project modal', () => {
      useProjectsStore.getState().openAddProjectModal();
      expect(useProjectsStore.getState().isAddProjectModalOpen).toBe(true);
    });

    it('should close add project modal', () => {
      useProjectsStore.getState().openAddProjectModal();
      useProjectsStore.getState().closeAddProjectModal();
      expect(useProjectsStore.getState().isAddProjectModalOpen).toBe(false);
    });

    it('should open edit project modal with selected project', () => {
      const project = createMockProject({ id: 'p1', name: 'Test' });
      useProjectsStore.getState().openEditProjectModal(project);

      const state = useProjectsStore.getState();
      expect(state.isEditProjectModalOpen).toBe(true);
      expect(state.selectedProject).toEqual(project);
    });

    it('should close edit project modal and clear selection', () => {
      const project = createMockProject({ id: 'p1' });
      useProjectsStore.getState().openEditProjectModal(project);
      useProjectsStore.getState().closeEditProjectModal();

      const state = useProjectsStore.getState();
      expect(state.isEditProjectModalOpen).toBe(false);
      expect(state.selectedProject).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should set error', () => {
      useProjectsStore.getState().setError('Test error');
      expect(useProjectsStore.getState().error).toBe('Test error');
    });

    it('should clear error', () => {
      useProjectsStore.getState().setError('Test error');
      useProjectsStore.getState().setError(null);
      expect(useProjectsStore.getState().error).toBeNull();
    });
  });

  describe('API Operations', () => {
    it('should handle fetch projects success', async () => {
      const mockProjects = [
        createMockProject({ id: 'p1', name: 'Project 1', order: 1 }),
        createMockProject({ id: 'p2', name: 'Project 2', order: 0 }),
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      await useProjectsStore.getState().fetchProjects();

      const state = useProjectsStore.getState();
      expect(state.projects).toHaveLength(2);
      // Should be sorted by order
      expect(state.projects[0].order).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch projects error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await useProjectsStore.getState().fetchProjects();

      const state = useProjectsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain('Failed to fetch projects');
    });

    it('should handle create project success', async () => {
      const newProject = createMockProject({ id: 'new-1', name: 'New Project' });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => newProject,
      });

      await useProjectsStore.getState().createProject({ name: 'New Project' });

      const state = useProjectsStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].name).toBe('New Project');
      expect(state.isLoading).toBe(false);
    });

    it('should handle create project error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await useProjectsStore.getState().createProject({ name: 'Test' });

      const state = useProjectsStore.getState();
      expect(state.error).toContain('Failed to create project');
      expect(state.isLoading).toBe(false);
    });

    it('should handle delete project with optimistic update', async () => {
      const projects = [
        createMockProject({ id: 'p1', isDefault: false }),
        createMockProject({ id: 'p2', isDefault: false }),
      ];
      useProjectsStore.setState({ projects });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      await useProjectsStore.getState().deleteProject('p1');

      const state = useProjectsStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe('p2');
    });

    it('should not delete default project', async () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1', isDefault: true })],
      });

      await useProjectsStore.getState().deleteProject('p1');

      const state = useProjectsStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.error).toBe('Cannot delete the default project');
    });

    it('should revert delete on API error', async () => {
      useProjectsStore.setState({
        projects: [createMockProject({ id: 'p1', isDefault: false })],
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await useProjectsStore.getState().deleteProject('p1');

      const state = useProjectsStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.error).toContain('Failed to delete project');
    });

    it('should switch active project when deleting active one', async () => {
      const defaultProject = createMockProject({ id: 'default', isDefault: true });
      const activeProject = createMockProject({ id: 'active', isDefault: false });
      useProjectsStore.setState({
        projects: [defaultProject, activeProject],
        activeProjectId: 'active',
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      await useProjectsStore.getState().deleteProject('active');

      const state = useProjectsStore.getState();
      expect(state.activeProjectId).toBe('default');
    });
  });

  describe('Update Project', () => {
    it('should update project with optimistic update', async () => {
      const project = createMockProject({ id: 'p1', name: 'Original' });
      useProjectsStore.setState({ projects: [project] });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...project, name: 'Updated' }),
      });

      await useProjectsStore.getState().updateProject('p1', { name: 'Updated' });

      const state = useProjectsStore.getState();
      expect(state.projects[0].name).toBe('Updated');
    });

    it('should revert update on API error', async () => {
      const project = createMockProject({ id: 'p1', name: 'Original' });
      useProjectsStore.setState({ projects: [project] });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await useProjectsStore.getState().updateProject('p1', { name: 'Updated' });

      const state = useProjectsStore.getState();
      expect(state.projects[0].name).toBe('Original');
      expect(state.error).toContain('Failed to update project');
    });
  });

  describe('Reorder Projects', () => {
    it('should reorder projects with optimistic update', async () => {
      const projects = [
        createMockProject({ id: 'p1', order: 0 }),
        createMockProject({ id: 'p2', order: 1 }),
        createMockProject({ id: 'p3', order: 2 }),
      ];
      useProjectsStore.setState({ projects });

      const reorderedProjects = [
        createMockProject({ id: 'p3', order: 0 }),
        createMockProject({ id: 'p1', order: 1 }),
        createMockProject({ id: 'p2', order: 2 }),
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => reorderedProjects,
      });

      await useProjectsStore.getState().reorderProjects(['p3', 'p1', 'p2']);

      const state = useProjectsStore.getState();
      expect(state.projects[0].id).toBe('p3');
    });

    it('should revert reorder on API error', async () => {
      const projects = [
        createMockProject({ id: 'p1', order: 0 }),
        createMockProject({ id: 'p2', order: 1 }),
      ];
      useProjectsStore.setState({ projects });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await useProjectsStore.getState().reorderProjects(['p2', 'p1']);

      const state = useProjectsStore.getState();
      // Original order should be restored
      expect(state.projects[0].id).toBe('p1');
      expect(state.error).toContain('Failed to reorder projects');
    });
  });
});
