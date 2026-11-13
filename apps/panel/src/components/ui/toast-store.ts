import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}
interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}
let next = 1;
const TTL_MS = 15_000; // con "Deshacer" damos tiempo de sobra (WCAG 2.2.1)

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = next++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => get().dismiss(id), TTL_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
