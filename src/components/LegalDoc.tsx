import Link from "next/link";
import { Shell } from "@/components/Shell";
import { LEGAL } from "@/app/legal/config";

// Shared chrome + typography for every legal document under /legal. Keeps the
// same look & feel as the public help page (Shell, brand mark, "P" logo) so the
// legal section doesn't feel bolted on. Documents pass their body as `children`
// built from the styled primitives exported below.
export function LegalDoc({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <div className="mx-auto max-w-[820px] pt-3.5 animate-pa-in">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink font-display text-[24px] font-bold text-white"
            aria-label="Inicio"
          >
            P
          </Link>
          <div>
            <div className="font-display text-[24px] font-bold tracking-[-.5px]">
              {LEGAL.brand}
            </div>
            <Link
              href="/legal"
              className="text-[13.5px] font-semibold text-[#6B7585] hover:text-ink"
            >
              Centro legal
            </Link>
          </div>
        </div>

        <h1 className="mb-3 font-display text-[32px] font-bold leading-[1.12] tracking-[-.8px]">
          {title}
        </h1>
        <p className="mb-4 max-w-[640px] text-[16px] leading-[1.55] text-[#6B7585]">
          {intro}
        </p>
        <div className="mb-8 flex flex-wrap gap-2 text-[12.5px] font-semibold text-[#5B6675]">
          <span className="rounded-full border border-[#E3E8EF] bg-white px-3 py-1.5">
            Última actualización: {LEGAL.updated}
          </span>
          <span className="rounded-full border border-[#E3E8EF] bg-white px-3 py-1.5">
            Legislación aplicable: Colombia
          </span>
        </div>

        <article className="rounded-[20px] border border-[#E3E8EF] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,.05)] sm:p-8">
          {children}
        </article>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/legal"
            className="text-[13.5px] font-bold text-[#6B7585] hover:text-ink"
          >
            ← Volver al centro legal
          </Link>
          <a
            href={`mailto:${LEGAL.operator.privacyEmail}`}
            className="text-[13.5px] font-bold text-blue hover:text-blue-dark"
          >
            Escríbenos: {LEGAL.operator.privacyEmail}
          </a>
        </div>
      </div>
    </Shell>
  );
}

// ── Styled primitives ──────────────────────────────────────────────────────
// Small building blocks so the document bodies read as content, not markup.

export function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-3 flex items-baseline gap-2.5 font-display text-[19px] font-bold leading-[1.25] tracking-[-.3px] text-ink">
        <span className="text-[14px] font-bold text-blue">{n}.</span>
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[14.5px] leading-[1.65] text-[#374151]">
        {children}
      </div>
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-ink">{children}</strong>;
}

export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 pl-1">{children}</ul>
  );
}

export function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-blue" />
      <span className="flex-1">{children}</span>
    </li>
  );
}

// Highlighted callout for the "important" bits (rights, cross-border, contact).
export function Note({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-blue-soft bg-blue-soft px-4 py-3.5">
      <div className="mb-1 text-[13.5px] font-bold text-blue-dark">{title}</div>
      <div className="text-[13.5px] leading-[1.6] text-ink/80">{children}</div>
    </div>
  );
}
