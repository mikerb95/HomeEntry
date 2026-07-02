"use client";

import { useRef } from "react";

// Accessible tab bar shared by the guard and admin panels: real tab semantics
// with roving focus — arrow keys move between tabs and activate them.
export function TabBar<K extends string>({
  label,
  tabs,
  active,
  onChange,
}: {
  label: string;
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent) {
    const idx = tabs.findIndex((t) => t.key === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex w-max max-w-full gap-1.5 overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white p-[5px]"
    >
      {tabs.map((t, i) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-[14px] font-bold"
            style={{
              background: selected ? "#0F141A" : "transparent",
              color: selected ? "#fff" : "#5B6675",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
