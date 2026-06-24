"use client";

import { useToast } from "@/lib/toast";

export function Toaster() {
  const toast = useToast((s) => s.toast);
  const dismiss = useToast((s) => s.dismiss);
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live={toast.kind === "warn" ? "assertive" : "polite"}
      className="fixed bottom-7 left-1/2 z-[80] flex items-center gap-2.5 rounded-[14px] px-5 py-3.5 text-[14.5px] font-bold text-white shadow-[0_16px_36px_-12px_rgba(15,20,26,.45)] animate-pa-up"
      style={{ background: toast.kind === "warn" ? "#D97706" : "#16A34A" }}
    >
      <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-white" />
      {toast.text}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar notificación"
        className="ml-1 flex h-5 w-5 flex-none items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
