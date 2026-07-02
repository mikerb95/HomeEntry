"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerFondoMovement } from "@/app/actions/finance";
import { Modal } from "@/components/Modal";
import { useToast } from "@/lib/toast";

export function FondoMovementModal({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<"aporte" | "retiro">("aporte");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();
  const router = useRouter();
  const show = useToast((s) => s.show);

  function save() {
    const n = parseInt(amount.replace(/\D/g, "") || "0", 10);
    if (n <= 0) {
      show("Ingresa un monto válido", "warn");
      return;
    }
    if (!concept.trim()) {
      show("Ingresa un concepto", "warn");
      return;
    }
    start(async () => {
      const res = await registerFondoMovement(slug, { type, amount, concept, date });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show(type === "aporte" ? "Aporte registrado" : "Retiro registrado", "ok");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      onClose={onClose}
      label="Movimiento del fondo de imprevistos"
      className="w-[400px]"
    >
      <div className="flex items-center justify-between border-b border-[#EEF1F6] px-[22px] py-[18px]">
        <span className="font-display text-[20px] font-bold">
          Movimiento del fondo
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="h-[30px] w-[30px] rounded-[9px] bg-[#F0F3F8] text-[17px] text-[#5B6675]"
        >
          ✕
        </button>
      </div>

      <div className="px-[22px] py-5">
        <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
          Tipo de movimiento
        </label>
        <div className="mb-4 flex gap-2.5">
          {(
            [
              { id: "aporte", label: "Aporte" },
              { id: "retiro", label: "Retiro" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="flex-1 rounded-[12px] border-2 p-[11px] text-[13px] font-bold"
              style={{
                borderColor: type === t.id ? "#2F6BFF" : "#E3E8EF",
                background: type === t.id ? "#EAF1FF" : "#fff",
                color: type === t.id ? "#2F6BFF" : "#6B7585",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
          Monto (COP)
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="0"
          className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[16px] font-bold outline-none focus:border-blue"
        />

        <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[15px] font-semibold outline-none focus:border-blue"
        />

        <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
          Concepto
        </label>
        <input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder={
            type === "aporte"
              ? "Ej: rendimientos financieros del trimestre"
              : "Ej: reparación de emergencia motobomba (aprobado por asamblea)"
          }
          className="mb-5 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[14px] font-semibold outline-none focus:border-blue"
        />

        <button
          onClick={save}
          disabled={pending}
          className="w-full rounded-[14px] bg-blue p-4 text-[15px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
        >
          {pending
            ? "Guardando…"
            : type === "aporte"
              ? "Registrar aporte"
              : "Registrar retiro"}
        </button>
      </div>
    </Modal>
  );
}
