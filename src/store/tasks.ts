import type { Task, TaskStatus, TaskAttachment } from "@/types";
import type { StateCreator } from "zustand";

export interface TaskSlice {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "completedAt" | "attachments">) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateTaskDescription: (id: string, description: string) => Promise<void>;
  updateTaskLivrables: (id: string, livrables: string) => Promise<void>;
  updateTaskCompletedAt: (id: string, completedAt: string | null) => Promise<void>;
  addManualLivrable: (taskId: string, titre: string, description: string, format: string) => void;
  removeManualLivrable: (taskId: string, index: number) => void;
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
    const completedAt = status === "fait" ? new Date().toISOString().split("T")[0] : null;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status, completedAt } : t)),
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

  updateTaskCompletedAt: async (id, completedAt) => {
    await fetch("/api/data/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed_at: completedAt }),
    });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completedAt } : t
      ),
    }));
  },

  addManualLivrable: (taskId, titre, description, format) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const existing = t.livrables_generes
          ? JSON.parse(t.livrables_generes)
          : { livrables: [], plan_action: "" };
        existing.livrables.push({ titre, description, format });
        const newVal = JSON.stringify(existing);
        // Fire-and-forget save to server
        fetch("/api/data/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, livrables_generes: newVal }),
        });
        return { ...t, livrables_generes: newVal };
      }),
    }));
  },

  removeManualLivrable: (taskId, index) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId || !t.livrables_generes) return t;
        const data = JSON.parse(t.livrables_generes);
        data.livrables.splice(index, 1);
        const newVal = JSON.stringify(data);
        fetch("/api/data/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, livrables_generes: newVal }),
        });
        return { ...t, livrables_generes: newVal };
      }),
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
