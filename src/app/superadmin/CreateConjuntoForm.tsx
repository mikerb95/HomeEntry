"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConjunto } from "@/app/actions/superadmin";
import { Label } from "@/components/ui";
import { useToast } from "@/lib/toast";
import type { City } from "@/db/schema";

const inputCls =
  "w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3 text-[15px] font-semibold outline-none focus:border-ink";

export function CreateConjuntoForm({ cities }: { cities: City[] }) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();

  const [slug, setSlug] = useState("");
  const [cityCode, setCityCode] = useState(cities[0]?.code ?? "");
  const [name, setName] = useState("");
  const [towers, setTowers] = useState("3");
  const [aptsPerTower, setAptsPerTower] = useState("8");
  const [carSpots, setCarSpots] = useState("12");
  const [motoSpots, setMotoSpots] = useState("8");
  const [visitorRate, setVisitorRate] = useState("3000");
  const [adminUser, setAdminUser] = useState("admin");
  const [adminPass, setAdminPass] = useState("");
  const [guardUser, setGuardUser] = useState("porteria");
  const [guardPass, setGuardPass] = useState("");

  function reset() {
    setSlug("");
    setName("");
    setAdminPass("");
    setGuardPass("");
  }

  function save() {
    start(async () => {
      const res = await createConjunto({
        slug,
        cityCode,
        name,
        towers,
        aptsPerTower,
        carSpots,
        motoSpots,
        visitorRate,
        adminUser,
        adminPass,
        guardUser,
        guardPass,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Conjunto creado", "ok");
      reset();
      router.refresh();
    });
  }

  return (
    <div className="rounded-[20px] border border-[#E6EBF2] bg-white p-6">
      <h2 className="mb-1 font-display text-[19px] font-bold tracking-[-.3px]">
        Crear conjunto
      </h2>
      <p className="mb-5 text-[13.5px] text-[#6B7585]">
        Disponible en{" "}
        <span className="font-mono font-semibold text-ink">
          /{slug || "identificador"}
        </span>
        . Código público:{" "}
        <span className="font-mono font-semibold text-ink">
          {cityCode || "CIU"}0000
        </span>
        .
      </p>

      <div className="grid grid-cols-1 gap-4 min-[680px]:grid-cols-2">
        <div>
          <Label>Nombre del conjunto</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Conjunto Las Palmas"
            className={inputCls}
          />
        </div>
        <div>
          <Label>Ciudad</Label>
          <select
            value={cityCode}
            onChange={(e) => setCityCode(e.target.value)}
            className={inputCls}
          >
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Identificador (slug)</Label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="laspalmas"
            className={`${inputCls} font-mono`}
          />
        </div>
        <div>
          <Label>Torres</Label>
          <input
            value={towers}
            onChange={(e) => setTowers(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
        <div>
          <Label>Aptos por torre</Label>
          <input
            value={aptsPerTower}
            onChange={(e) => setAptsPerTower(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
        <div>
          <Label>Parqueaderos de carro</Label>
          <input
            value={carSpots}
            onChange={(e) => setCarSpots(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
        <div>
          <Label>Parqueaderos de moto</Label>
          <input
            value={motoSpots}
            onChange={(e) => setMotoSpots(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
        <div className="min-[680px]:col-span-2">
          <Label>Tarifa visitante (COP/hora)</Label>
          <input
            value={visitorRate}
            onChange={(e) => setVisitorRate(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 rounded-[14px] bg-[#F6F8FB] p-4 min-[680px]:grid-cols-2">
        <div>
          <Label>Usuario administrador</Label>
          <input
            value={adminUser}
            onChange={(e) => setAdminUser(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <Label>Clave administrador</Label>
          <input
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            type="password"
            placeholder="••••••"
            className={inputCls}
          />
        </div>
        <div>
          <Label>Usuario portería</Label>
          <input
            value={guardUser}
            onChange={(e) => setGuardUser(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <Label>Clave portería</Label>
          <input
            value={guardPass}
            onChange={(e) => setGuardPass(e.target.value)}
            type="password"
            placeholder="••••••"
            className={inputCls}
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={pending}
        className="mt-5 w-full rounded-[14px] bg-ink p-4 text-[15px] font-extrabold text-white hover:opacity-90 disabled:opacity-70"
      >
        {pending ? "Creando…" : "Crear conjunto"}
      </button>
    </div>
  );
}
