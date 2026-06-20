import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { listConjuntos } from "@/db/queries";
import { logout } from "@/app/actions/auth";
import { Shell } from "@/components/Shell";
import { IconLogout } from "@/components/icons";
import { CreateConjuntoForm } from "./CreateConjuntoForm";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  await requireSuperadmin();
  const conjuntos = await listConjuntos();

  return (
    <Shell>
      <div className="mx-auto max-w-[860px] pt-2 animate-pa-in">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-ink text-[20px] font-bold text-white">
              S
            </div>
            <div>
              <div className="font-display text-[22px] font-bold tracking-[-.4px]">
                Conjuntos
              </div>
              <div className="text-[13px] font-semibold text-[#8A94A3]">
                {conjuntos.length} activo{conjuntos.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-[7px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-2 text-[13px] font-bold text-[#5B6675] hover:bg-[#F6F8FB] hover:text-ink"
            >
              <IconLogout size={15} />
              Salir
            </button>
          </form>
        </div>

        <div className="mb-6 overflow-hidden rounded-[20px] border border-[#E6EBF2] bg-white">
          {conjuntos.length === 0 && (
            <div className="px-5 py-8 text-center text-[14px] text-[#8A94A3]">
              Aún no has creado conjuntos.
            </div>
          )}
          {conjuntos.map((c) => (
            <Link
              key={c.id}
              href={`/${c.slug}`}
              className="flex items-center justify-between gap-3 border-b border-[#F2F5F9] px-5 py-4 last:border-b-0 hover:bg-[#F8FAFD]"
            >
              <div className="min-w-0">
                <div className="truncate font-display text-[16px] font-bold text-ink">
                  {c.name}
                </div>
                <div className="font-mono text-[12.5px] font-semibold text-[#8A94A3]">
                  /{c.slug} · {c.towers} torres · {c.aptsPerTower} aptos/torre
                </div>
              </div>
              <span className="whitespace-nowrap text-[12.5px] font-bold text-blue">
                Abrir →
              </span>
            </Link>
          ))}
        </div>

        <CreateConjuntoForm />
      </div>
    </Shell>
  );
}
