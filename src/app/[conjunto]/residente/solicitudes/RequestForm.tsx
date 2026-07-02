"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitServiceRequest } from "@/app/actions/resident";
import { useToast } from "@/lib/toast";

const inputCls =
  "w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-blue";
const lab =
  "mb-2 block text-[12.5px] font-bold uppercase tracking-[.5px] text-[#5B6675]";

export function RequestForm({ slug }: { slug: string }) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");

  function submit() {
    start(async () => {
      const res = await submitServiceRequest(slug, { subject, detail });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Solicitud enviada a la administración", "ok");
      setSubject("");
      setDetail("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-5">
      <h2 className="mb-1 font-display text-[18px] font-bold">
        Nueva solicitud
      </h2>
      <p className="mb-4 text-[13.5px] text-[#6B7585]">
        Cuéntale a la administración qué necesitas — reparaciones, dudas
        sobre tu cuota, o cualquier otro trámite.
      </p>
      <label className={lab}>Asunto</label>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Ej. Fuga de agua en el baño"
        className={`${inputCls} mb-3.5`}
      />
      <label className={lab}>Detalle</label>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Describe la solicitud con el mayor detalle posible…"
        className={`${inputCls} mb-4 min-h-[100px] resize-y`}
      />
      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-[14px] bg-blue p-[15px] text-[15px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
      >
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </div>
  );
}
