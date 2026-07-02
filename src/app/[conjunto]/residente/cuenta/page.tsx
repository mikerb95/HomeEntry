import Link from "next/link";
import { requireResident } from "@/lib/auth";
import {
  getConjuntoById,
  listChargesForApt,
  listPaymentsForApt,
} from "@/db/queries";
import { computeAptBalance } from "@/lib/finance";
import { Shell } from "@/components/Shell";
import { BackLink } from "@/components/ui";
import { fmtCOP, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Movement = {
  id: string;
  kind: "cargo" | "pago";
  concept: string;
  amount: number;
  date: Date;
};

export default async function ResidentAccountPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireResident(slug);
  const cid = session.conjuntoId;
  const [config, charges, payments] = await Promise.all([
    getConjuntoById(cid),
    listChargesForApt(cid, session.aptoKey),
    listPaymentsForApt(cid, session.aptoKey),
  ]);

  const balance = computeAptBalance(
    charges,
    payments,
    config?.moraRatePct ?? 0,
    config?.moraGraceDays ?? 0,
  );
  const alDia = balance.total <= 0;

  const movements: Movement[] = [
    ...charges.map((c) => ({
      id: `c-${c.id}`,
      kind: "cargo" as const,
      concept: `${c.concept} · ${c.period}`,
      amount: c.amount,
      date: c.dueDate,
    })),
    ...payments.map((p) => ({
      id: `p-${p.id}`,
      kind: "pago" as const,
      concept:
        p.method === "efectivo"
          ? "Pago en efectivo"
          : p.method === "acuerdo_pago"
            ? "Consolidado en acuerdo de pago"
            : "Pago",
      amount: p.amount,
      date: p.paidAt,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

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

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-[26px] font-bold tracking-[-.6px]">
            Mi estado de cuenta
          </h1>
          {alDia && (
            <Link
              href={`/${slug}/residente/cuenta/paz-y-salvo`}
              className="rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-[13px] text-[14.5px] font-bold text-ink hover:bg-[#F6F8FB]"
            >
              Descargar paz y salvo
            </Link>
          )}
        </div>

        <div className="mb-[22px] grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-3">
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Saldo actual
            </div>
            <div className="font-display text-[26px] font-bold tracking-[-1px]">
              {fmtCOP(Math.max(0, balance.total))}
            </div>
          </div>
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Estado
            </div>
            <span
              className="inline-block rounded-full px-[11px] py-1 text-[13px] font-bold"
              style={
                alDia
                  ? { background: "#E9F8EE", color: "#16A34A" }
                  : { background: "#FDECEF", color: "#E11D48" }
              }
            >
              {alDia
                ? "Al día"
                : balance.enMora
                  ? `En mora (${fmtCOP(balance.mora)})`
                  : "Con saldo pendiente"}
            </span>
          </div>
          <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]">
            <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
              Total pagado
            </div>
            <div className="font-display text-[26px] font-bold tracking-[-1px]">
              {fmtCOP(balance.totalPagado)}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
          <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
            <h2 className="font-display text-[18px] font-bold">Movimientos</h2>
          </div>
          <div>
            {movements.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-[13px] border-b border-[#F2F5F9] px-5 py-[15px] last:border-b-0"
              >
                <span
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-[15px] font-extrabold"
                  style={
                    m.kind === "pago"
                      ? { background: "#E9F8EE", color: "#16A34A" }
                      : { background: "#FDECEF", color: "#E11D48" }
                  }
                >
                  {m.kind === "pago" ? "↓" : "↑"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold text-ink">
                    {m.concept}
                  </div>
                  <div className="mt-0.5 text-[12.5px] font-semibold text-[#6B7585]">
                    {m.kind === "pago" ? "Pago recibido" : "Vence"}{" "}
                    {fmtDate(m.date)}
                  </div>
                </div>
                <div
                  className="whitespace-nowrap font-display text-[15.5px] font-bold"
                  style={{ color: m.kind === "pago" ? "#16A34A" : "#1B2432" }}
                >
                  {m.kind === "pago" ? "+" : "−"}
                  {fmtCOP(m.amount)}
                </div>
              </div>
            ))}
            {movements.length === 0 && (
              <div className="px-5 py-9 text-center text-[14px] text-[#6B7585]">
                Aún no hay cargos ni pagos registrados para tu apartamento.
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
