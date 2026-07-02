"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCompany, assignConjuntoCompany } from "@/app/actions/superadmin";
import { Label } from "@/components/ui";
import { useToast } from "@/lib/toast";

const inputCls =
  "w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3 text-[15px] font-semibold outline-none focus:border-ink";

type CompanyRow = { id: string; name: string; nit: string };
type ConjuntoRow = { id: string; name: string; companyId: string | null };

export function CompaniesPanel({
  companies,
  conjuntos,
}: {
  companies: CompanyRow[];
  conjuntos: ConjuntoRow[];
}) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();

  const [name, setName] = useState("");
  const [nit, setNit] = useState("");

  function save() {
    start(async () => {
      const res = await createCompany({ name, nit });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Administradora creada", "ok");
      setName("");
      setNit("");
      router.refresh();
    });
  }

  function assign(conjuntoId: string, companyId: string) {
    start(async () => {
      const res = await assignConjuntoCompany({ conjuntoId, companyId });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Asignación actualizada", "ok");
      router.refresh();
    });
  }

  const countByCompany = new Map<string, number>();
  conjuntos.forEach((c) => {
    if (c.companyId)
      countByCompany.set(c.companyId, (countByCompany.get(c.companyId) ?? 0) + 1);
  });

  return (
    <div className="mb-6 rounded-[20px] border border-[#E6EBF2] bg-white p-6">
      <h2 className="mb-1 font-display text-[19px] font-bold tracking-[-.3px]">
        Administradoras
      </h2>
      <p className="mb-5 text-[13.5px] text-[#6B7585]">
        Empresas que administran varios conjuntos. Un conjunto sin
        administradora es autoadministrado.
      </p>

      {companies.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-[14px] border border-[#EEF1F6]">
          {companies.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-[#F2F5F9] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-bold text-ink">
                  {c.name}
                </div>
                {c.nit && (
                  <div className="font-mono text-[12px] font-semibold text-[#6B7585]">
                    NIT {c.nit}
                  </div>
                )}
              </div>
              <span className="whitespace-nowrap text-[12.5px] font-bold text-[#6B7585]">
                {countByCompany.get(c.id) ?? 0} conjunto
                {(countByCompany.get(c.id) ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 min-[680px]:grid-cols-[1fr_220px_auto]">
        <div>
          <Label>Nombre de la administradora</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Administraciones El Nogal SAS"
            className={inputCls}
          />
        </div>
        <div>
          <Label>NIT (opcional)</Label>
          <input
            value={nit}
            onChange={(e) => setNit(e.target.value.replace(/[^\d-]/g, ""))}
            placeholder="900123456-7"
            inputMode="numeric"
            className={`${inputCls} font-mono`}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={save}
            disabled={pending}
            className="w-full rounded-[12px] bg-ink px-5 py-3 text-[14px] font-extrabold text-white hover:opacity-90 disabled:opacity-70"
          >
            {pending ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>

      {companies.length > 0 && conjuntos.length > 0 && (
        <div className="mt-5 rounded-[14px] bg-[#F6F8FB] p-4">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
            Asignar conjuntos
          </div>
          <div className="grid grid-cols-1 gap-3 min-[680px]:grid-cols-2">
            {conjuntos.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-[14px] font-bold text-ink">
                  {c.name}
                </div>
                <select
                  value={c.companyId ?? ""}
                  onChange={(e) => assign(c.id, e.target.value)}
                  disabled={pending}
                  className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-3 py-2 text-[13px] font-semibold outline-none"
                >
                  <option value="">Autoadministrado</option>
                  {companies.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
