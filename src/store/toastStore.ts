import { create } from 'zustand';

export interface ToastRequest {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Each toast gets its own id, so a new one restarts the timer. */
export type Toast = ToastRequest & { id: number };

interface ToastState {
  toast: Toast | null;
  showToast: (request: ToastRequest) => void;
  dismissToast: () => void;
}

let nextId = 1;

/** Short messages that outlive the screen that raised them. Never persisted. */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (request) => set({ toast: { ...request, id: nextId++ } }),
  dismissToast: () => set({ toast: null }),
}));
