"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible overlay dialog shared by every modal in the app. Focus moves into
// the dialog on open and returns to the opener on close; Escape and clicking
// the backdrop dismiss it; Tab cycles inside (focus trap).
export function Modal({
  onClose,
  label,
  className = "w-[420px]",
  children,
}: {
  onClose: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      opener?.focus();
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex animate-pa-in items-center justify-center bg-[rgba(15,20,26,.5)] p-5 backdrop-blur-[3px]"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-full animate-pa-pop overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-20px_rgba(15,20,26,.5)] outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
