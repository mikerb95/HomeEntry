"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentAgreement } from "@/app/actions/finance";
import { Modal } from "@/components/Modal";
import { useToast } from "@/lib/toast";
import { fmtCOP } from "@/lib/format";

export function PaymentAgreementModal({
  slug,
  aptoKey,
  aptoLabel,
  currentDebt,
  onClose,
}: {
  slug: string;
  aptoKey: string;
  aptoLabel: string;
  currentDebt: number;
  onClose: () => void;
}) {
  const [installments, setInstallments] = useState("3");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [pending, start] = useTransition();
  const router = useRouter();
  const show = useToast((s) => s.show);

  const n = parseInt(installments || "0", 10);
  const cuotaPreview = n > 0 ? Math.round(currentDebt / n) : 0;

  function save() {
    if (isNaN(n) || n < 2 || n > 36) {
      show("Elige entre 2 y 36 cuotas", "warn");
      return;
    }
    start(async () => {
      const res = await createPaymentAgreement(slug, {
        aptoKey,
        installments,
        startDate,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Propuesta enviada al residente", "ok");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      onClose={onClose}
      label={`Acuerdo de pago · ${aptoLabel}`}
      className="w-[400px]"
    >
      <div className="flex items-center justify-between border-b border-[#EEF1F6] px-[22px] py-[18px]">
        <span className="font-display text-[20px] font-bold">
          Acuerdo de pago · {aptoLabel}
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
        <div className="mb-4 rounded-[13px] bg-[#F6F8FB] px-4 py-3.5">
          <div className="text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Saldo a consolidar
          </div>
          <div className="mt-1 font-display text-[19px] font-bold text-ink">
            {fmtCOP(currentDebt)}
          </div>
        </div>

        <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
          Número de cuotas
        </label>
        <input
          value={installments}
          onChange={(e) => setInstallments(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="3"
          className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[16px] font-bold outline-none focus:border-blue"
        />

        <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
          Fecha de la primera cuota
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[15px] font-semibold outline-none focus:border-blue"
        />

        {n >= 2 && n <= 36 && (
          <p className="mb-5 text-[13px] text-[#6B7585]">
            {n} cuotas de aproximadamente{" "}
            <strong className="text-ink">{fmtCOP(cuotaPreview)}</strong>{" "}
            mensuales, empezando el mes de la fecha elegida. El residente
            recibe la propuesta en su portal y debe aceptarla; solo entonces
            se consolida la deuda (con la mora acumulada hasta ese día) y
            deja de generar mora. Si una cuota del acuerdo se vence, sí
            empieza a generar mora normalmente.
          </p>
        )}

        <button
          onClick={save}
          disabled={pending}
          className="w-full rounded-[14px] bg-blue p-4 text-[15px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
        >
          {pending ? "Enviando…" : "Proponer acuerdo de pago"}
        </button>
      </div>
    </Modal>
  );
}
