import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import {
  getCompanyById,
  getFinancialSummary,
  listConjuntosForCompany,
} from "@/db/queries";
import { Shell } from "@/components/Shell";
import { BackLink } from "@/components/ui";
import { fmtCOP } from "@/lib/format";

export const dynamic = "force-dynamic";

// Consolidated portfolio for an administradora (companies entity): cartera,
// mora and aging across every conjunto it manages, with per-conjunto rows and
// portfolio-wide totals. Superadmin-only for now — when administradoras get
// their own logins this becomes their landing view.
export default async function PortafolioPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  await requireSuperadmin();
  const { companyId } = await params;
  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const conjuntosList = await listConjuntosForCompany(companyId);
  const summaries = await Promise.all(
    conjuntosList.map(async (c) => {
      const s = await getFinancialSummary(c.id);
      const unitsEnMora = s.aptBalances.filter((b) => b.enMora).length;
      return { conjunto: c, summary: s, unitsEnMora };
    }),
  );

  const totals = summaries.reduce(
    (a, { summary: s, unitsEnMora }) => ({
      cartera: a.cartera + s.carteraTotal,
      mora: a.mora + s.moraTotal,
      recaudo: a.recaudo + s.recaudoTotal,
      d90plus: a.d90plus + s.agingTotals.d90plus,
      unitsEnMora: a.unitsEnMora + unitsEnMora,
    }),
    { cartera: 0, mora: 0, recaudo: 0, d90plus: 0, unitsEnMora: 0 },
  );

  const th =
    "px-3.5 py-3 text-left text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]";

  return (
    <Shell>
      <div className="mx-auto max-w-[1000px] pt-2 animate-pa-in">
        <BackLink href="/superadmin">← Panel superadmin</BackLink>

        <div className="mb-1 text-[12.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
          Portafolio
        </div>
        <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-.6px]">
          {company.name}
        </h1>
        <div className="mb-6 text-[13.5px] font-semibold text-[#6B7585]">
          {company.nit && <>NIT {company.nit} · </>}
          {conjuntosList.length} conjunto{conjuntosList.length === 1 ? "" : "s"}{" "}
          administrado{conjuntosList.length === 1 ? "" : "s"}
        </div>

        <div className="mb-[22px] grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-4">
          {[
            { label: "Cartera total", value: fmtCOP(totals.cartera) },
            { label: "Mora acumulada", value: fmtCOP(totals.mora) },
            { label: "Cartera +90 días", value: fmtCOP(totals.d90plus) },
            { label: "Unidades en mora", value: String(totals.unitsEnMora) },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]"
            >
              <div className="mb-2 text-[12.5px] font-bold text-[#6B7585]">
                {t.label}
              </div>
              <div className="font-display text-[22px] font-bold tracking-[-.8px]">
                {t.value}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
          <div className="border-b border-[#EEF1F6] px-[22px] py-5">
            <h2 className="font-display text-[19px] font-bold">
              Cartera por conjunto
            </h2>
            <div className="mt-0.5 text-[13px] text-[#6B7585]">
              Saldos, mora y antigüedad de cartera de cada conjunto del
              portafolio.
            </div>
          </div>
          {summaries.length === 0 ? (
            <div className="px-5 py-9 text-center text-[14px] text-[#6B7585]">
              Esta administradora aún no tiene conjuntos asignados. Asígnalos
              desde el panel superadmin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD]">
                    <th className={`${th} pl-[22px]`}>Conjunto</th>
                    <th className={`${th} text-right`}>Cartera</th>
                    <th className={`${th} text-right`}>Mora</th>
                    <th className={`${th} text-right`}>+90 días</th>
                    <th className={`${th} text-right`}>Unid. en mora</th>
                    <th className={`${th} pr-[22px]`}></th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map(({ conjunto: c, summary: s, unitsEnMora }) => (
                    <tr key={c.id} className="border-t border-[#F0F3F7]">
                      <td className="px-[22px] py-3.5">
                        <div className="text-[14px] font-bold text-ink">
                          {c.name}
                        </div>
                        <div className="font-mono text-[12px] font-semibold text-[#6B7585]">
                          {c.code} · /{c.slug}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-semibold text-[#3C4654]">
                        {fmtCOP(s.carteraTotal)}
                      </td>
                      <td
                        className="px-3.5 py-3.5 text-right text-[14px] font-semibold"
                        style={{
                          color: s.moraTotal > 0 ? "#E11D48" : "#3C4654",
                        }}
                      >
                        {fmtCOP(s.moraTotal)}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-semibold text-[#3C4654]">
                        {fmtCOP(s.agingTotals.d90plus)}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-semibold text-[#3C4654]">
                        {unitsEnMora}
                      </td>
                      <td className="px-3.5 py-3.5 pr-[22px] text-right">
                        <Link
                          href={`/${c.slug}/admin`}
                          className="whitespace-nowrap text-[12.5px] font-bold text-blue hover:underline"
                        >
                          Abrir panel →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
