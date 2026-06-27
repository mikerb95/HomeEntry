"use client";

import { useEffect, useState } from "react";
import {
  sendTestPush,
  subscribeResident,
  unsubscribeResident,
} from "@/app/actions/push";
import { IconBell } from "@/components/icons";
import { useToast } from "@/lib/toast";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// The push service expects the VAPID public key as a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushOptIn({ slug }: { slug: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const show = useToast((s) => s.show);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !VAPID
      ) {
        if (!cancelled) setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") setState("denied");
        else setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      // Must be called from a user gesture (this click) per iOS requirements.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        show("No se activaron las notificaciones", "warn");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      const json = sub.toJSON();
      const res = await subscribeResident(slug, {
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });
      if (!res.ok) {
        show(res.error || "No se pudo activar", "warn");
        return;
      }
      setState("on");
      show("Notificaciones activadas", "ok");
    } catch {
      show("No se pudo activar en este dispositivo", "warn");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const res = await sendTestPush(slug);
      if (res.ok) show("Notificación de prueba enviada", "ok");
      else show(res.error || "No se pudo enviar", "warn");
    } catch {
      show("No se pudo enviar la prueba", "warn");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeResident(slug, sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      show("Notificaciones desactivadas", "ok");
    } catch {
      show("No se pudo desactivar", "warn");
    } finally {
      setBusy(false);
    }
  }

  // Nothing to offer where push isn't available — WhatsApp still covers them.
  if (state === "loading" || state === "unsupported") return null;

  const base =
    "mb-[22px] flex flex-wrap items-center gap-3 rounded-[16px] border px-4 py-3.5";

  if (state === "denied") {
    return (
      <div className={`${base} border-[#F4CE7A] bg-[#FEF3DC]`}>
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#D97706] text-white">
          <IconBell size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-[#B45309]">
            Notificaciones bloqueadas
          </div>
          <div className="text-[13px] text-[#92600C]">
            Actívalas para este sitio desde los ajustes de tu navegador.
          </div>
        </div>
      </div>
    );
  }

  if (state === "on") {
    return (
      <div className={`${base} border-[#B7E6C7] bg-[#E9F8EE]`}>
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-green text-white">
          <IconBell size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-[#15803D]">
            Notificaciones activadas
          </div>
          <div className="text-[13px] text-[#1F7A43]">
            Recibirás avisos de portería en este dispositivo.
          </div>
        </div>
        <button
          onClick={disable}
          disabled={busy}
          className="flex-none rounded-[11px] border border-[#B7E6C7] bg-white px-3.5 py-2 text-[13px] font-bold text-[#15803D] disabled:opacity-60"
        >
          Desactivar
        </button>
      </div>
    );
  }

  // state === "off"
  return (
    <div className={`${base} border-[#E3E8EF] bg-white`}>
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#EAF1FF] text-blue">
        <IconBell size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-extrabold text-ink">
          Activa las notificaciones
        </div>
        <div className="text-[13px] text-[#6B7585]">
          Recibe avisos de visitas, encomiendas y administración sin depender de
          WhatsApp.
        </div>
      </div>
      <button
        onClick={enable}
        disabled={busy}
        className="flex-none rounded-[12px] bg-blue px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-blue-dark disabled:opacity-60"
      >
        {busy ? "Activando…" : "Activar"}
      </button>
    </div>
  );
}
