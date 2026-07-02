import { requireResident } from "@/lib/auth";

export const dynamic = "force-dynamic";

import {
  getConjuntoById,
  listNoticesForApt,
  listServiceRequestsForApt,
} from "@/db/queries";
import { Shell } from "@/components/Shell";
import { BackLink } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { RequestForm } from "./RequestForm";

const REQUEST_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  abierto: { bg: "#FDECEF", fg: "#E11D48", label: "Abierto" },
  en_proceso: { bg: "#FEF3DC", fg: "#B45309", label: "En proceso" },
  resuelto: { bg: "#E9F8EE", fg: "#16A34A", label: "Resuelto" },
};

const NOTICE_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  abierto: { bg: "#FDECEF", fg: "#E11D48", label: "Abierto" },
  cerrado: { bg: "#E9F8EE", fg: "#16A34A", label: "Cerrado" },
};

export default async function ResidentRequestsPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireResident(slug);
  const cid = session.conjuntoId;
  const [config, requests, notices] = await Promise.all([
    getConjuntoById(cid),
    listServiceRequestsForApt(cid, session.aptoKey),
    listNoticesForApt(cid, session.aptoKey),
  ]);

  return (
    <Shell
      chrome={{
        title: config?.name ?? "Conjunto",
        sub: `Apto ${session.apt} · Torre ${session.tower.slice(1)}`,
        role: "Residente",
        badgeBg: "#EAF1FF",
        badgeFg: "#2F6BFF",
      }}
    >
      <div className="animate-pa-in">
        <BackLink href={`/${slug}/residente`}>← Mi panel</BackLink>

        <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-.6px]">
          Solicitudes y llamados de atención
        </h1>
        <p className="mb-5 text-[14px] text-[#6B7585]">
          Radica solicitudes a la administración y revisa el estado de tu
          apartamento.
        </p>

        <div className="block items-start gap-[22px] min-[860px]:grid min-[860px]:grid-cols-[.9fr_1.1fr]">
          <RequestForm slug={slug} />

          <div className="mt-[18px] flex flex-col gap-[18px] min-[860px]:mt-0">
            <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
              <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
                <h2 className="font-display text-[18px] font-bold">
                  Mis solicitudes
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
                      <div className="mt-1 text-[12px] font-semibold text-[#6B7585]">
                        {fmtDateTime(r.createdAt)}
                      </div>
                    </div>
                  );
                })}
                {requests.length === 0 && (
                  <div className="px-5 py-9 text-center text-[14px] text-[#6B7585]">
                    Aún no has enviado solicitudes.
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
              <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
                <h2 className="font-display text-[18px] font-bold">
                  Llamados de atención
                </h2>
                <div className="mt-0.5 text-[13px] text-[#6B7585]">
                  Registrados por la administración para tu apartamento
                </div>
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
                      <div className="mt-1 text-[12px] font-semibold text-[#6B7585]">
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
          </div>
        </div>
      </div>
    </Shell>
  );
}
