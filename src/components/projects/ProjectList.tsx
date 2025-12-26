"use client";

import { useEffect } from "react";
import { Plus, Settings, ChevronDown } from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { useProjectsStore } from "@/stores/projects-store";
import { useWidgetStore } from "@/stores/widget-store";
import type { Project } from "@/lib/db/schema";

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  widgetCount: number;
  onClick: () => void;
  onEdit: () => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

function ProjectItemContent({
  project,
  isActive,
  widgetCount,
  onClick,
  onEdit,
  isDragging,
  isOverlay,
}: ProjectItemProps) {
  // Dynamically get the icon component
  const iconName = project.icon || "Folder";
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    iconName
  ] || Icons.Folder;

  return (
    <motion.div
      className={`group relative ${isDragging && !isOverlay ? "opacity-40" : ""}`}
      initial={false}
      animate={{
        scale: isOverlay ? 1.02 : 1,
        boxShadow: isOverlay
          ? "0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 4px 10px -5px rgba(0, 0, 0, 0.2)"
          : "none",
      }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        } ${isOverlay ? "bg-sidebar/95 backdrop-blur-sm border border-sidebar-border rounded-lg" : ""}`}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color || "#6366f1" }}
        />
        <IconComponent className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{project.name}</span>
        {widgetCount > 0 && (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
            {widgetCount}
          </Badge>
        )}
      </button>

      {/* Edit button - shown on hover */}
      {!isOverlay && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Editar proyecto"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function SortableProjectItem({
  project,
  isActive,
  widgetCount,
  onClick,
  onEdit,
}: Omit<ProjectItemProps, "isDragging" | "isOverlay">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation cursor-default"
    >
      <ProjectItemContent
        project={project}
        isActive={isActive}
        widgetCount={widgetCount}
        onClick={onClick}
        onEdit={onEdit}
        isDragging={isDragging}
      />
    </div>
  );
}

interface ProjectListProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function ProjectList({ isCollapsed = false, onToggle }: ProjectListProps) {
  const projects = useProjectsStore((state) => state.projects);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  const setActiveProject = useProjectsStore((state) => state.setActiveProject);
  const fetchProjects = useProjectsStore((state) => state.fetchProjects);
  const reorderProjects = useProjectsStore((state) => state.reorderProjects);
  const openAddProjectModal = useProjectsStore((state) => state.openAddProjectModal);
  const openEditProjectModal = useProjectsStore((state) => state.openEditProjectModal);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const widgets = useWidgetStore((state) => state.widgets);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Initialize projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleProjectClick = (projectId: string) => {
    // Only trigger click if not dragging
    if (!activeId) {
      setActiveProject(projectId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedProjects.findIndex((p) => p.id === active.id);
      const newIndex = sortedProjects.findIndex((p) => p.id === over.id);

      const newOrder = arrayMove(sortedProjects, oldIndex, newIndex);
      const orderedIds = newOrder.map((p) => p.id);
      reorderProjects(orderedIds);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Get widget count for each project
  const getWidgetCount = (projectId: string) => {
    return widgets.filter((w) => w.projectId === projectId).length;
  };

  // Sort projects by order
  const sortedProjects = [...projects].sort((a, b) => a.order - b.order);

  // Get the active project for overlay
  const activeProject = activeId
    ? sortedProjects.find((p) => p.id === activeId)
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-1">
        {onToggle ? (
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <motion.div
              initial={false}
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="h-3 w-3" />
            </motion.div>
            Proyectos
            {sortedProjects.length > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">
                {sortedProjects.length}
              </Badge>
            )}
          </button>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Proyectos
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          onClick={openAddProjectModal}
          title="Nuevo proyecto"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Project list with drag and drop */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={sortedProjects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedProjects.map((project) => (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    isActive={activeProjectId === project.id}
                    widgetCount={getWidgetCount(project.id)}
                    onClick={() => handleProjectClick(project.id)}
                    onEdit={() => openEditProjectModal(project)}
                  />
                ))}
              </SortableContext>

              {/* Drag overlay - shows the item being dragged */}
              <DragOverlay dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
              }}>
                {activeProject ? (
                  <ProjectItemContent
                    project={activeProject}
                    isActive={activeProjectId === activeProject.id}
                    widgetCount={getWidgetCount(activeProject.id)}
                    onClick={() => {}}
                    onEdit={() => {}}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>

            {!isLoading && sortedProjects.length === 0 && (
              <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                No hay proyectos creados
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
