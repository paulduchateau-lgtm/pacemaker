import type { Task, TaskStatus, TaskAttachment } from "@/types";
import type { StateCreator } from "zustand";

export interface TaskSlice {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "attachments">) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateTaskDescription: (id: string, description: string) => Promise<void>;
  updateTaskLivrables: (id: string, livrables: string) => Promise<void>;
  addTaskAttachment: (taskId: string, file: File) => Promise<void>;
  deleteTaskAttachment: (attachId: string, taskId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTasks: (tasks: Task[]) => void;
}

export const createTaskSlice: StateCreator<TaskSlice> = (set) => ({
  tasks: [],

  fetchTasks: async () => {
    const res = await fetch("/api/data/tasks");
    const data = await res.json();
    set({ tasks: data });
  },

  addTask: async (task) => {
    const res = await fetch("/api/data/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    const created = await res.json();
    set((state) => ({ tasks: [...state.tasks, created] }));
  },

  updateTaskStatus: async (id, status) => {
    await fetch("/api/data/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  },

  updateTaskDescription: async (id, description) => {
    await fetch("/api/data/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, description }),
    });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, description } : t
      ),
    }));
  },

  updateTaskLivrables: async (id, livrables_generes) => {
    await fetch("/api/data/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, livrables_generes }),
    });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, livrables_generes } : t
      ),
    }));
  },

  addTaskAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append("taskId", taskId);
    formData.append("file", file);
    const res = await fetch("/api/data/tasks/attachments", {
      method: "POST",
      body: formData,
    });
    const attachment: TaskAttachment = await res.json();
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, attachments: [...(t.attachments || []), attachment] }
          : t
      ),
    }));
  },

  deleteTaskAttachment: async (attachId, taskId) => {
    await fetch(`/api/data/tasks/attachments?id=${attachId}`, {
      method: "DELETE",
    });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              attachments: (t.attachments || []).filter(
                (a) => a.id !== attachId
              ),
            }
          : t
      ),
    }));
  },

  deleteTask: async (id) => {
    await fetch(`/api/data/tasks?id=${id}`, { method: "DELETE" });
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  setTasks: (tasks) => set({ tasks }),
});
