import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="mx-auto max-w-[480px] pt-12 text-center animate-pa-in">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[16px] bg-ink font-display text-[24px] font-bold text-white">
          404
        </div>
        <h1 className="mb-3 font-display text-[28px] font-bold leading-[1.15] tracking-[-.6px]">
          No encontramos esta página
        </h1>
        <p className="mx-auto mb-7 max-w-[400px] text-[15.5px] leading-[1.6] text-[#5B6675]">
          Es posible que el enlace esté mal escrito o que el conjunto ya no
          exista. Verifica el código QR o el enlace que te compartió la
          administración.
        </p>
        <Link
          href="/"
          className="inline-block rounded-[13px] bg-ink px-5 py-3 text-[14.5px] font-bold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </Shell>
  );
}
