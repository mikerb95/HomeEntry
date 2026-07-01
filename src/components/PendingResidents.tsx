"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveResident, rejectResident } from "@/app/actions/registrations";
import { IconCheck } from "@/components/icons";
import { useToast } from "@/lib/toast";

export type PendingResident = {
  aptoKey: string;
  tower: string;
  apt: string;
  phoneMasked: string;
};

// Shared approval list for the portería and administración panels. Staff verify
// the person belongs to the apartment (they know the residents / can confirm at
// the entrance) and approve; only then can the resident log in. The phone is
// shown masked — enough to cross-check verbally, never the full number.
export function PendingResidents({
  slug,
  pending,
  accent = "#16A34A",
}: {
  slug: string;
  pending: PendingResident[];
  accent?: string;
}) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pendingTx, start] = useTransition();

  function act(kind: "approve" | "reject", aptoKey: string) {
    start(async () => {
      const res =
        kind === "approve"
          ? await approveResident(slug, aptoKey)
          : await rejectResident(slug, aptoKey);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        router.refresh();
        return;
      }
      show(
        kind === "approve" ? "Registro aprobado" : "Solicitud rechazada",
        "ok",
      );
      router.refresh();
    });
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[#D9E0EA] bg-[#F9FBFD] p-6 text-center text-[14px] font-semibold text-[#6B7585]">
        No hay solicitudes de registro pendientes.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.map((r) => (
        <div
          key={r.aptoKey}
          className="flex flex-wrap items-center gap-3 rounded-[16px] border border-[#E6EBF2] bg-white p-4"
        >
          <div className="min-w-[160px] flex-1">
            <div className="text-[15px] font-extrabold text-ink">
              Torre {r.tower.replace(/^T/, "")} · Apto {r.apt}
            </div>
            <div className="text-[13px] font-semibold text-[#6B7585]">
              WhatsApp {r.phoneMasked}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => act("reject", r.aptoKey)}
              disabled={pendingTx}
              className="rounded-[11px] border-[1.5px] border-[#E3E8EF] px-4 py-[9px] text-[13.5px] font-bold text-[#BE123C] disabled:opacity-60"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => act("approve", r.aptoKey)}
              disabled={pendingTx}
              className="inline-flex items-center gap-1.5 rounded-[11px] px-4 py-[9px] text-[13.5px] font-bold text-white disabled:opacity-60"
              style={{ background: accent }}
            >
              <IconCheck size={14} />
              Aprobar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
