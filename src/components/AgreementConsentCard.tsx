"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToPaymentAgreement } from "@/app/actions/finance";
import { useToast } from "@/lib/toast";
import { fmtCOP, fmtDate } from "@/lib/format";

// Consent step of the payment-agreement flow: shows the resident the plan the
// admin proposed against their *live* balance (mora keeps accruing until they
// accept, so this figure — recomputed server-side on accept — is the one that
// gets consolidated, not the snapshot taken when the admin proposed).
export function AgreementConsentCard({
  slug,
  agreementId,
  currentDebt,
  installments,
  startDateIso,
}: {
  slug: string;
  agreementId: string;
  currentDebt: number;
  installments: number;
  startDateIso: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const show = useToast((s) => s.show);

  const cuotaAprox = Math.round(currentDebt / installments);
  const startDate = new Date(startDateIso);

  function respond(accept: boolean) {
    start(async () => {
      const res = await respondToPaymentAgreement(slug, {
        agreementId,
        accept,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        router.refresh();
        return;
      }
      show(
        accept
          ? "Acuerdo de pago aceptado. Tus cuotas ya aparecen en los movimientos."
          : "Propuesta rechazada. La administración quedó notificada.",
        "ok",
      );
      router.refresh();
    });
  }

  return (
    <div className="mb-[22px] rounded-[20px] border-[1.5px] border-[#2F6BFF] bg-[#F5F8FF] p-[22px]">
      <div className="mb-1 text-[12px] font-bold uppercase tracking-[.5px] text-[#2F6BFF]">
        Propuesta de acuerdo de pago
      </div>
      <h2 className="font-display text-[20px] font-bold text-ink">
        La administración te propone pagar tu saldo en {installments} cuotas
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-[#3C4654]">
        Tu saldo total a hoy es{" "}
        <strong className="text-ink">{fmtCOP(currentDebt)}</strong> (incluye
        intereses de mora hasta la fecha). Si aceptas, ese saldo se consolida
        en {installments} cuotas mensuales de aproximadamente{" "}
        <strong className="text-ink">{fmtCOP(cuotaAprox)}</strong>, la primera
        con vencimiento el {fmtDate(startDate)}. La deuda consolidada deja de
        generar mora; si una cuota del acuerdo se vence, esa cuota sí genera
        mora normalmente.
      </p>

      <label className="mt-4 flex items-start gap-2.5 text-[13.5px] font-semibold text-[#3C4654]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-[3px] h-4 w-4 accent-[#2F6BFF]"
        />
        <span>
          Acepto consolidar mi saldo total a la fecha de aceptación en{" "}
          {installments} cuotas mensuales según lo descrito. Entiendo que esta
          aceptación queda registrada con fecha, hora y datos de mi sesión.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => respond(true)}
          disabled={pending || !confirmed}
          className="rounded-[14px] bg-blue px-6 py-3.5 text-[14.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-50"
        >
          {pending ? "Procesando…" : "Aceptar acuerdo"}
        </button>
        <button
          onClick={() => respond(false)}
          disabled={pending}
          className="rounded-[14px] border-[1.5px] border-[#E3E8EF] bg-white px-6 py-3.5 text-[14.5px] font-bold text-[#3C4654] hover:bg-[#F6F8FB] disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
