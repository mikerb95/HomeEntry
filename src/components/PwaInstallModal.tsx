"use client";

import { useEffect, useState } from "react";

// Chrome/Edge fire this non-standard event when the app is installable.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pa-pwa-install-dismissed";
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari expone esta propiedad no estándar en modo app.
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallModal() {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    if (isIos()) {
      // iOS no soporta beforeinstallprompt: mostramos instrucciones manuales.
      setIos(true);
      setOpen(true);
      return;
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Sin localStorage solo se oculta durante esta visita.
    }
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "dismissed") {
      dismiss();
      return;
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[60] flex animate-pa-in items-center justify-center bg-[rgba(15,20,26,.5)] p-5 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] max-w-full animate-pa-pop overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-20px_rgba(15,20,26,.5)]"
      >
        <div className="flex items-center justify-between border-b border-[#EEF1F6] px-[22px] py-[18px]">
          <span className="font-display text-[20px] font-bold">
            Instala HomeEntry
          </span>
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="h-[30px] w-[30px] rounded-[9px] bg-[#F0F3F8] text-[17px] text-[#5B6675]"
          >
            ✕
          </button>
        </div>

        <div className="px-[22px] py-5">
          <div className="mb-4 flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt="HomeEntry"
              className="h-[52px] w-[52px] rounded-[14px] shadow-[0_8px_20px_-8px_rgba(47,107,255,.5)]"
            />
            <p className="text-[14px] font-semibold leading-snug text-[#5B6675]">
              Agrega la app a tu pantalla de inicio para entrar más rápido y
              recibir notificaciones de tu conjunto.
            </p>
          </div>

          {ios ? (
            <ol className="mb-5 list-inside list-decimal space-y-1.5 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[14px] font-semibold text-[#3A4453]">
              <li>
                Toca el botón <span className="text-blue">Compartir</span> en
                Safari
              </li>
              <li>
                Elige{" "}
                <span className="text-blue">
                  &ldquo;Agregar a pantalla de inicio&rdquo;
                </span>
              </li>
              <li>Confirma con &ldquo;Agregar&rdquo;</li>
            </ol>
          ) : null}

          <div className="flex gap-2.5">
            {ios ? (
              <button
                onClick={dismiss}
                className="w-full rounded-[13px] bg-blue py-3.5 text-[15px] font-bold text-white"
              >
                Entendido
              </button>
            ) : (
              <>
                <button
                  onClick={dismiss}
                  className="w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-3.5 text-[15px] font-bold text-[#5B6675]"
                >
                  Ahora no
                </button>
                <button
                  onClick={install}
                  className="w-full rounded-[13px] bg-blue py-3.5 text-[15px] font-bold text-white"
                >
                  Instalar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
