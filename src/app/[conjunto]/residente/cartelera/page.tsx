import Link from "next/link";
import { requireResident } from "@/lib/auth";

export const dynamic = "force-dynamic";

import { getConjuntoById, listAnnouncements } from "@/db/queries";
import { Shell } from "@/components/Shell";
import { IconMegaphone } from "@/components/icons";
import { announcementMeta } from "@/lib/meta";
import { fmtDate } from "@/lib/format";

export default async function CarteleraPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireResident(slug);
  const [config, items] = await Promise.all([
    getConjuntoById(session.conjuntoId),
    listAnnouncements(session.conjuntoId),
  ]);

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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#EEE9FF] text-[#6D28D9]">
                <IconMegaphone size={20} />
              </span>
              <h1 className="font-display text-[26px] font-bold tracking-[-.6px]">
                Cartelera informativa
              </h1>
            </div>
            <div className="mt-[3px] text-[14px] font-semibold text-[#6B7585]">
              Comunicados de la administración
            </div>
          </div>
          <Link
            href={`/${slug}/residente`}
            className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-[13px] text-[14.5px] font-bold text-ink hover:bg-[#F6F8FB]"
          >
            ← Volver
          </Link>
        </div>

        <div className="flex flex-col gap-3.5">
          {items.map((a) => {
            const m = announcementMeta[a.category] ?? announcementMeta.general;
            return (
              <article
                key={a.id}
                className="overflow-hidden rounded-[20px] border bg-white"
                style={{
                  borderColor: a.pinned ? m.fg : "#E8ECF2",
                  boxShadow: a.pinned
                    ? `0 0 0 1px ${m.fg}22, 0 10px 26px -18px ${m.fg}66`
                    : undefined,
                }}
              >
                <div className="flex items-start gap-[14px] p-5">
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-[15px] font-extrabold"
                    style={{ background: m.bg, color: m.fg }}
                  >
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-[9px] py-[3px] text-[11.5px] font-bold"
                        style={{ background: m.bg, color: m.fg }}
                      >
                        {m.label}
                      </span>
                      {a.pinned ? (
                        <span className="rounded-full bg-[#FDF3D6] px-[9px] py-[3px] text-[11.5px] font-bold text-[#B45309]">
                          📌 Fijado
                        </span>
                      ) : null}
                      <span className="text-[12px] font-semibold text-[#6B7585]">
                        {fmtDate(a.createdAt)}
                      </span>
                    </div>
                    <h2 className="font-display text-[18px] font-bold tracking-[-.3px]">
                      {a.title}
                    </h2>
                    <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-[1.55] text-[#4A5462]">
                      {a.body}
                    </p>
                    <div className="mt-3 text-[12.5px] font-semibold text-[#6B7585]">
                      {a.createdBy}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {items.length === 0 && (
            <div className="rounded-[20px] border border-[#E8ECF2] bg-white px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#F1F4F9] text-[#6B7585]">
                <IconMegaphone size={22} />
              </div>
              <div className="text-[15px] font-bold text-ink">
                No hay comunicados por ahora
              </div>
              <div className="mt-1 text-[13.5px] text-[#6B7585]">
                Aquí verás los avisos que publique la administración.
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
