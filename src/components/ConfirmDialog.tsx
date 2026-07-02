"use client";

import { Modal } from "./Modal";

// In-design replacement for window.confirm, used before destructive actions.
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Eliminar",
  pending = false,
  onConfirm,
  onClose,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} label={title} className="w-[400px]">
      <div className="px-[22px] py-5">
        <h2 className="mb-1.5 font-display text-[18px] font-bold">{title}</h2>
        <p className="text-[14px] leading-[1.5] text-[#5B6675]">{body}</p>
      </div>
      <div className="flex gap-2.5 border-t border-[#EEF1F6] px-[22px] py-4">
        <button
          onClick={onClose}
          className="flex-1 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-3.5 text-[14px] font-bold text-[#5B6675]"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={pending}
          className="flex-1 rounded-[13px] bg-rose p-3.5 text-[14.5px] font-extrabold text-white hover:bg-rose-dark disabled:opacity-70"
        >
          {pending ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
