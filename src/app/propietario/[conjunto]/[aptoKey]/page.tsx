import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import {
  getConjuntoBySlug,
  listChargesForApt,
  listNoticesForApt,
  listPaymentsForApt,
  listServiceRequestsForApt,
  ownerHoldsUnit,
} from "@/db/queries";
import { computeAptBalance } from "@/lib/finance";
import { Shell } from "@/components/Shell";
import { BackLink } from "@/components/ui";
import { fmtCOP, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const NOTICE_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  abierto: { bg: "#FDECEF", fg: "#E11D48", label: "Abierto" },
  cerrado: { bg: "#E9F8EE", fg: "#16A34A", label: "Cerrado" },
};

const REQUEST_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  abierto: { bg: "#FDECEF", fg: "#E11D48", label: "Abierto" },
  en_proceso: { bg: "#FEF3DC", fg: "#B45309", label: "En proceso" },
  resuelto: { bg: "#E9F8EE", fg: "#16A34A", label: "Resuelto" },
};

export default async function OwnerUnitPage({
  params,
}: {
  params: Promise<{ conjunto: string; aptoKey: string }>;
}) {
  const { conjunto: slug, aptoKey } = await params;
  const session = await requireOwner();
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) notFound();

  const holds = await ownerHoldsUnit(session.ownerId, conjunto.id, aptoKey);
  if (!holds) notFound();

  const [charges, payments, notices, requests] = await Promise.all([
    listChargesForApt(conjunto.id, aptoKey),
    listPaymentsForApt(conjunto.id, aptoKey),
    listNoticesForApt(conjunto.id, aptoKey),
    listServiceRequestsForApt(conjunto.id, aptoKey),
  ]);

  const balance = computeAptBalance(
    charges,
    payments,
    conjunto.moraRatePct,
    conjunto.moraGraceDays,
  );

  const [tower, apt] = aptoKey.split("-");
  const openNotices = notices.filter((n) => n.status === "abierto").length;
  const openRequests = requests.filter((r) => r.status !== "resuelto").length;

  return (
    <Shell
      chrome={{
        title: conjunto.name,
        sub: `Torre ${tower?.replace(/^T/, "")} · Apto ${apt}`,
        role: "Propietario",
        badgeBg: "#EEE9FF",
        badgeFg: "#6D28D9",
      }}
    >
      <div className="animate-pa-in">
        <BackLink href="/propietario">← Mis unidades</BackLink>

        <div className="mb-[22px] grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-2 min-[1040px]:grid-cols-4">
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Saldo actual
            </div>
            <div className="font-display text-[26px] font-bold tracking-[-1px]">
              {fmtCOP(balance.total)}
            </div>
          </div>
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Estado de mora
            </div>
            <span
              className="inline-block rounded-full px-[11px] py-1 text-[13px] font-bold"
              style={
                balance.enMora
                  ? { background: "#FDECEF", color: "#E11D48" }
                  : { background: "#E9F8EE", color: "#16A34A" }
              }
            >
              {balance.enMora ? `En mora (${fmtCOP(balance.mora)})` : "Al día"}
            </span>
          </div>
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Llamados de atención abiertos
            </div>
            <div className="font-display text-[26px] font-bold tracking-[-1px]">
              {openNotices}
            </div>
          </div>
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Solicitudes en curso
            </div>
            <div className="font-display text-[26px] font-bold tracking-[-1px]">
              {openRequests}
            </div>
          </div>
        </div>

        <div className="block items-start gap-[22px] min-[780px]:grid min-[780px]:grid-cols-2">
          <div className="mb-[18px] overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white min-[780px]:mb-0">
            <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
              <h2 className="font-display text-[18px] font-bold">
                Llamados de atención
              </h2>
            </div>
            <div>
              {notices.map((n) => {
                const m = NOTICE_STATUS[n.status] ?? NOTICE_STATUS.abierto;
                return (
                  <div
                    key={n.id}
                    className="border-b border-[#F2F5F9] px-5 py-[15px] last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14.5px] font-bold text-ink">
                        {n.category}
                      </span>
                      <span
                        className="rounded-full px-[9px] py-[3px] text-[11.5px] font-bold"
                        style={{ background: m.bg, color: m.fg }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-[#6B7585]">
                      {n.detail}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-[#A2ABB8]">
                      {fmtDateTime(n.createdAt)}
                    </div>
                  </div>
                );
              })}
              {notices.length === 0 && (
                <div className="px-5 py-9 text-center text-[14px] text-[#6B7585]">
                  Sin llamados de atención registrados.
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
            <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
              <h2 className="font-display text-[18px] font-bold">
                Solicitudes
              </h2>
            </div>
            <div>
              {requests.map((r) => {
                const m = REQUEST_STATUS[r.status] ?? REQUEST_STATUS.abierto;
                return (
                  <div
                    key={r.id}
                    className="border-b border-[#F2F5F9] px-5 py-[15px] last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14.5px] font-bold text-ink">
                        {r.subject}
                      </span>
                      <span
                        className="rounded-full px-[9px] py-[3px] text-[11.5px] font-bold"
                        style={{ background: m.bg, color: m.fg }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-[#6B7585]">
                      {r.detail}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-[#A2ABB8]">
                      {fmtDateTime(r.createdAt)}
                    </div>
                  </div>
                );
              })}
              {requests.length === 0 && (
                <div className="px-5 py-9 text-center text-[14px] text-[#6B7585]">
                  Sin solicitudes registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
