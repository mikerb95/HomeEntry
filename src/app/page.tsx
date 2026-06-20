import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

// Root landing. There is no global conjunto — each complex lives at its own
// slug (e.g. /laspalmas). Residents reach it via the QR / link the admin shares.
export default function RootPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-[640px] pt-10 text-center animate-pa-in">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[16px] bg-ink font-display text-[28px] font-bold text-white">
          P
        </div>
        <h1 className="mb-3 font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
          PortAl · Gestión Residencial
        </h1>
        <p className="mx-auto mb-8 max-w-[460px] text-[16px] leading-[1.6] text-[#6B7585]">
          Cada conjunto tiene su propio acceso. Abre el enlace o escanea el
          código QR que te compartió la administración de tu conjunto para
          entrar.
        </p>
        <div className="mx-auto max-w-[420px] rounded-[16px] border border-[#E3E8EF] bg-white p-5 text-left text-[13.5px] text-[#5B6675]">
          <div className="mb-1 font-bold text-ink">¿Eres administrador?</div>
          El panel de gestión de conjuntos está en{" "}
          <span className="font-mono font-semibold text-ink">/superadmin</span>.
        </div>
      </div>
    </Shell>
  );
}
