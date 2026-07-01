import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { getOwner, listUnitsForOwner } from "@/db/queries";
import { Shell } from "@/components/Shell";
import { fmtPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const session = await requireOwner();
  const [me, units] = await Promise.all([
    getOwner(session.ownerId),
    listUnitsForOwner(session.ownerId),
  ]);

  return (
    <Shell
      chrome={{
        title: "La Oportunidad",
        sub: `WhatsApp +57 ${fmtPhone(me?.phone ?? "")}`,
        role: "Propietario",
        badgeBg: "#EEE9FF",
        badgeFg: "#6D28D9",
      }}
    >
      <div className="animate-pa-in">
        <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-.6px]">
          Mis unidades
        </h1>
        <p className="mb-6 text-[14.5px] text-[#6B7585]">
          Elige una unidad para ver llamados de atención, mora y solicitudes.
        </p>

        <div className="flex flex-col gap-3">
          {units.map((u) => (
            <Link
              key={`${u.conjuntoId}-${u.aptoKey}`}
              href={`/propietario/${u.conjuntoSlug}/${u.aptoKey}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[#E8ECF2] bg-white p-5 transition-transform hover:-translate-y-[2px] hover:shadow-[0_16px_36px_-20px_rgba(15,20,26,.4)]"
            >
              <div className="min-w-0">
                <div className="font-display text-[17px] font-bold text-ink">
                  Torre {u.tower.replace(/^T/, "")} · Apto {u.apt}
                </div>
                <div className="text-[13px] font-semibold text-[#6B7585]">
                  {u.conjuntoName}
                </div>
              </div>
              <span className="whitespace-nowrap text-[12.5px] font-bold text-[#6D28D9]">
                Ver detalle →
              </span>
            </Link>
          ))}
          {units.length === 0 && (
            <div className="rounded-[18px] border border-dashed border-[#D9E0EA] bg-[#F9FBFD] p-8 text-center text-[14px] text-[#6B7585]">
              Aún no tienes unidades vinculadas. Pídele a la administración
              del conjunto que te dé acceso.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
