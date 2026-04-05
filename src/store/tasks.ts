import type { Task, TaskStatus } from "@/types";
import type { StateCreator } from "zustand";

export interface TaskSlice {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
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

  deleteTask: async (id) => {
    await fetch(`/api/data/tasks?id=${id}`, { method: "DELETE" });
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  setTasks: (tasks) => set({ tasks }),
});
