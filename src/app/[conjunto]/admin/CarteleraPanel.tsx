"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementPinned,
} from "@/app/actions/announcements";
import { announcementMeta, AnnouncementCategory } from "@/lib/meta";
import { fmtDate } from "@/lib/format";
import { useToast } from "@/lib/toast";

export type AnnouncementRow = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  pinned: boolean;
  createdAtIso: string;
};

const CATEGORIES = Object.entries(announcementMeta).map(([id, m]) => ({
  id,
  label: m.label,
}));

const inputCls =
  "w-full rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none focus:border-[#6D28D9]";
const lab =
  "mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]";

export function CarteleraPanel({
  slug,
  announcements,
}: {
  slug: string;
  announcements: AnnouncementRow[];
}) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();

  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  function submit() {
    start(async () => {
      const res = await createAnnouncement(slug, {
        category,
        title,
        body,
        pinned,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Comunicado publicado", "ok");
      setTitle("");
      setBody("");
      setPinned(false);
      router.refresh();
    });
  }

  function togglePin(a: AnnouncementRow) {
    start(async () => {
      const res = await setAnnouncementPinned(slug, a.id, !a.pinned);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show(a.pinned ? "Comunicado desfijado" : "Comunicado fijado", "ok");
      router.refresh();
    });
  }

  function remove(a: AnnouncementRow) {
    if (!confirm(`¿Eliminar el comunicado "${a.title}"?`)) return;
    start(async () => {
      const res = await deleteAnnouncement(slug, a.id);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Comunicado eliminado", "ok");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Publicar comunicado */}
      <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
        <h2 className="mb-1 font-display text-[19px] font-bold">
          Publicar comunicado
        </h2>
        <p className="mb-3.5 text-[13px] text-[#6B7585]">
          Todos los residentes del conjunto lo verán en su cartelera. Los
          comunicados fijados se muestran siempre de primeros.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label className={lab}>Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[240px] flex-1">
            <label className={lab}>Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Corte de agua el sábado"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className={lab}>Contenido</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el comunicado para los residentes…"
            className={`${inputCls} min-h-[96px] resize-y`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#3C4654]">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-[15px] w-[15px] accent-[#6D28D9]"
            />
            📌 Fijar en la parte superior de la cartelera
          </label>
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-[11px] bg-[#6D28D9] px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-[#5B21B6] disabled:opacity-70"
          >
            {pending ? "Publicando…" : "Publicar comunicado"}
          </button>
        </div>
      </div>

      {/* Comunicados publicados */}
      <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
        <h2 className="mb-3.5 font-display text-[19px] font-bold">
          Comunicados publicados
        </h2>
        <div className="flex flex-col gap-2">
          {announcements.map((a) => {
            const m = announcementMeta[a.category] ?? announcementMeta.general;
            return (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-[13px] border border-[#EEF1F6] px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-[9px] py-[3px] text-[11px] font-bold"
                      style={{ background: m.bg, color: m.fg }}
                    >
                      {m.label}
                    </span>
                    {a.pinned && (
                      <span className="rounded-full bg-[#FDF3D6] px-[9px] py-[3px] text-[11px] font-bold text-[#B45309]">
                        📌 Fijado
                      </span>
                    )}
                    <span className="text-[11.5px] font-semibold text-[#6B7585]">
                      {fmtDate(a.createdAtIso)}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-ink">{a.title}</div>
                  <div className="truncate text-[13px] text-[#6B7585]">
                    {a.body}
                  </div>
                </div>
                <div className="flex flex-none gap-2">
                  <button
                    onClick={() => togglePin(a)}
                    disabled={pending}
                    className="rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-white px-3.5 py-[7px] text-[13px] font-bold text-ink hover:bg-[#F6F8FB] disabled:opacity-60"
                  >
                    {a.pinned ? "Desfijar" : "Fijar"}
                  </button>
                  <button
                    onClick={() => remove(a)}
                    disabled={pending}
                    className="rounded-[9px] px-3.5 py-[7px] text-[13px] font-bold text-white disabled:opacity-60"
                    style={{ background: "#E11D48" }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
          {announcements.length === 0 && (
            <div className="p-4 text-center text-[13.5px] text-[#6B7585]">
              Aún no has publicado comunicados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
