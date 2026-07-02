import { redirect } from "next/navigation";
import { requireResident } from "@/lib/auth";
import {
  getConjuntoById,
  listChargesForApt,
  listPaymentsForApt,
} from "@/db/queries";
import { computeAptBalance } from "@/lib/finance";
import { BackLink } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

// Printable "paz y salvo" certificate. Only reachable while the unit owes
// nothing (charges + mora fully covered); otherwise we bounce back to the
// estado de cuenta so it can't be forged by URL.
export default async function PazYSalvoPage({
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
  if (balance.total > 0) redirect(`/${slug}/residente/cuenta`);

  const today = new Date();

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <BackLink href={`/${slug}/residente/cuenta`}>
          ← Mi estado de cuenta
        </BackLink>
        <PrintButton />
      </div>

      <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-10 print:rounded-none print:border-0 print:p-0">
        <div className="mb-8 text-center">
          <div className="font-display text-[22px] font-bold tracking-[-.4px]">
            {config?.name ?? "Conjunto"}
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[#6B7585]">
            Administración · Código {config?.code}
          </div>
        </div>

        <h1 className="mb-8 text-center font-display text-[28px] font-bold tracking-[-.6px]">
          PAZ Y SALVO
        </h1>

        <p className="mb-6 text-[15px] leading-[1.7] text-ink">
          La administración de <strong>{config?.name}</strong> certifica que el
          apartamento <strong>{session.apt}</strong> de la torre{" "}
          <strong>{session.tower.slice(1)}</strong> se encuentra a{" "}
          <strong>paz y salvo por todo concepto</strong> de cuotas de
          administración, intereses de mora y demás obligaciones registradas a
          la fecha de expedición de este documento.
        </p>

        <p className="mb-10 text-[13.5px] leading-[1.7] text-[#6B7585]">
          Este paz y salvo es válido únicamente a la fecha de su expedición y
          no cubre obligaciones generadas con posterioridad. Expedido a
          solicitud del interesado el {fmtDate(today)}.
        </p>

        <div className="mt-14 border-t border-[#E3E8EF] pt-3 text-center">
          <div className="text-[14px] font-bold text-ink">Administración</div>
          <div className="text-[12.5px] font-semibold text-[#6B7585]">
            {config?.name}
          </div>
        </div>
      </div>
    </div>
  );
}
