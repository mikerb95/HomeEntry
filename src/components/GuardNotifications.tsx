"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pollAuthNotifications,
  type AuthNotification,
} from "@/app/actions/notifications";
import { IconBell } from "@/components/icons";
import { fmtTime } from "@/lib/format";

const POLL_MS = 10000;

export function GuardNotifications({
  slug,
  serverNowIso,
}: {
  slug: string;
  serverNowIso: string;
}) {
  // Session-scoped notification feed. We only track authorizations created
  // after the guard opened the screen — older ones already show in the panel.
  const [items, setItems] = useState<AuthNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<AuthNotification | null>(null);

  const sinceRef = useRef(serverNowIso);
  const seenRef = useRef<Set<string>>(new Set());
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await pollAuthNotifications(slug, sinceRef.current);
      sinceRef.current = res.nowIso;

      const fresh = res.items.filter((i) => !seenRef.current.has(i.id));
      if (fresh.length === 0) return;
      fresh.forEach((i) => seenRef.current.add(i.id));

      // res.items come newest-first; keep that order in the feed.
      setItems((prev) => [...fresh, ...prev]);

      if (document.visibilityState === "visible") {
        // View is active → flash the top badge with the most recent one.
        setBanner(fresh[0]);
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => setBanner(null), 6000);
      } else {
        // View was inactive → park it in the notifications panel as unread.
        setUnread((u) => u + fresh.length);
      }
    } catch {
      // Transient errors (navigation, session refresh) — retry next tick.
    }
  }, [slug]);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    // Catch up immediately when the guard returns to the tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [poll]);

  function toggleOpen() {
    setOpen((o) => {
      if (!o) setUnread(0);
      return !o;
    });
  }

  function describe(n: AuthNotification) {
    return `${n.tower} · Apto ${n.apt}${n.plate ? ` · ${n.plate}` : ""}`;
  }

  return (
    <div className="mb-4">
      {/* Top badge — only appears when a new auth lands while the tab is active */}
      {banner && (
        <div className="mb-3 flex animate-pa-in items-center gap-3 rounded-[14px] border border-[#B7E6C7] bg-[#E9F8EE] px-4 py-3 shadow-[0_12px_30px_-18px_rgba(22,163,74,.6)]">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-green text-white">
            <IconBell size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-extrabold text-[#15803D]">
              Nueva autorización · {banner.visitor}
            </div>
            <div className="truncate text-[13px] text-[#1F7A43]">
              {describe(banner)}
            </div>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="flex-none rounded-[9px] bg-white/70 px-2.5 py-1 text-[13px] font-bold text-[#15803D]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bell + notifications panel (the "apartado" that holds what arrived) */}
      <div className="relative flex justify-end">
        <button
          onClick={toggleOpen}
          className="relative flex items-center gap-2 rounded-[12px] border border-[#E3E8EF] bg-white px-3.5 py-2.5 text-[13.5px] font-bold text-[#5B6675]"
        >
          <IconBell size={17} />
          Notificaciones
          {unread > 0 && (
            <span className="ml-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose px-1 text-[11px] font-extrabold text-white">
              {unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-[40]"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-[calc(100%+8px)] z-[50] w-[320px] max-w-[88vw] animate-pa-pop overflow-hidden rounded-[16px] border border-[#E6EBF2] bg-white shadow-[0_24px_60px_-24px_rgba(15,20,26,.5)]">
              <div className="flex items-center justify-between border-b border-[#EEF1F6] px-4 py-3">
                <span className="text-[14px] font-extrabold text-ink">
                  Notificaciones
                </span>
                <span className="text-[12px] font-semibold text-[#6B7585]">
                  {items.length} en este turno
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#6B7585]">
                    No hay notificaciones nuevas.
                  </div>
                ) : (
                  items.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2.5 border-b border-[#F2F5F9] px-4 py-3 last:border-b-0"
                    >
                      <span className="mt-[3px] h-[8px] w-[8px] flex-none rounded-full bg-green" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-ink">
                          Nueva autorización · {n.visitor}
                        </div>
                        <div className="truncate text-[12.5px] text-[#6B7585]">
                          {describe(n)}
                        </div>
                        <div className="mt-0.5 text-[11.5px] font-semibold text-[#9AA4B2]">
                          {fmtTime(n.createdAtIso)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
