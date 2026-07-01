"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/app/actions/finance";
import { Modal } from "@/components/Modal";
import { useToast } from "@/lib/toast";

export function PaymentModal({
  slug,
  aptoKey,
  aptoLabel,
  onClose,
}: {
  slug: string;
  aptoKey: string;
  aptoLabel: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"transferencia" | "efectivo" | "otro">(
    "transferencia",
  );
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const show = useToast((s) => s.show);

  function save() {
    const n = parseInt(amount.replace(/\D/g, "") || "0", 10);
    if (n <= 0) {
      show("Ingresa un monto válido", "warn");
      return;
    }
    start(async () => {
      const res = await recordPayment(slug, { aptoKey, amount, method, paidAt, note });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Pago registrado", "ok");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      onClose={onClose}
      label={`Registrar pago de ${aptoLabel}`}
      className="w-[400px]"
    >
        <div className="flex items-center justify-between border-b border-[#EEF1F6] px-[22px] py-[18px]">
          <span className="font-display text-[20px] font-bold">
            Registrar pago · {aptoLabel}
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
            Fecha del pago
          </label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[15px] font-semibold outline-none focus:border-blue"
          />

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Método
          </label>
          <div className="mb-4 flex gap-2.5">
            {(["transferencia", "efectivo", "otro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className="flex-1 rounded-[12px] border-2 p-[11px] text-[13px] font-bold capitalize"
                style={{
                  borderColor: method === m ? "#2F6BFF" : "#E3E8EF",
                  background: method === m ? "#EAF1FF" : "#fff",
                  color: method === m ? "#2F6BFF" : "#6B7585",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Nota (opcional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: transferencia Bancolombia"
            className="mb-5 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[14px] font-semibold outline-none focus:border-blue"
          />

          <button
            onClick={save}
            disabled={pending}
            className="w-full rounded-[14px] bg-blue p-4 text-[15px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
          >
            Registrar pago
          </button>
        </div>
    </Modal>
  );
}
