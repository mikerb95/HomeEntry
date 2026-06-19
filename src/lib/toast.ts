"use client";

import { create } from "zustand";

export type ToastKind = "ok" | "warn";

interface ToastState {
  toast: { id: number; text: string; kind: ToastKind } | null;
  show: (text: string, kind?: ToastKind) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toast: null,
  show: (text, kind = "ok") => {
    const id = Date.now() + Math.random();
    set({ toast: { id, text, kind } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 2600);
  },
}));
