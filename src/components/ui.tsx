import Link from "next/link";
import { InputHTMLAttributes } from "react";

export const ACCENTS = {
  blue: { color: "#2F6BFF", hover: "#1E54E0", focus: "focus:border-[#2F6BFF]" },
  green: { color: "#16A34A", hover: "#15803D", focus: "focus:border-[#16A34A]" },
  violet: { color: "#6D28D9", hover: "#5B21B6", focus: "focus:border-[#6D28D9]" },
} as const;

export type Accent = keyof typeof ACCENTS;

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[12.5px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] font-semibold outline-none";

export function TextInput({
  accent = "blue",
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { accent?: Accent }) {
  return (
    <input
      {...props}
      className={`${inputBase} p-[15px] text-[16px] ${ACCENTS[accent].focus} ${className}`}
    />
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-[18px] inline-flex items-center gap-[7px] rounded-[10px] px-3 py-[7px] text-[13.5px] font-bold text-[#6B7585]"
    >
      {children}
    </Link>
  );
}

export function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[#E6EBF2] bg-white p-8 shadow-[0_18px_44px_-26px_rgba(15,20,26,.34)]">
      {children}
    </div>
  );
}
