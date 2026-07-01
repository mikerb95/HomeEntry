import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { IconHelp, IconLogout } from "./icons";

export type ChromeProps = {
  title: string;
  sub: string;
  role: string;
  badgeBg: string;
  badgeFg: string;
};

export function Chrome({ title, sub, role, badgeBg, badgeFg }: ChromeProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-[#E2E8F1] bg-white/90 px-3.5 py-[11px] backdrop-blur-[14px] sm:gap-3.5 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ink font-display text-[17px] font-bold text-white">
          P
        </div>
        <div className="min-w-0 leading-[1.15]">
          <div className="truncate font-display text-[15px] font-bold tracking-[-.2px]">
            {title}
          </div>
          <div className="truncate text-[11.5px] font-semibold text-[#6B7585]">
            {sub}
          </div>
        </div>
      </div>
      <span
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-bold sm:px-[11px]"
        style={{ background: badgeBg, color: badgeFg }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="hidden xs:inline">{role}</span>
      </span>
      <Link
        href="/ayuda"
        aria-label="Ayuda"
        className="flex h-9 shrink-0 items-center justify-center gap-[7px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-2.5 text-[13px] font-bold text-[#5B6675] hover:bg-[#F6F8FB] hover:text-ink sm:px-[13px]"
      >
        <IconHelp size={16} />
        <span className="hidden sm:inline">Ayuda</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          aria-label="Salir"
          className="flex h-9 shrink-0 items-center justify-center gap-[7px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-2.5 text-[13px] font-bold text-[#5B6675] hover:bg-[#F6F8FB] hover:text-ink sm:px-[13px]"
        >
          <IconLogout size={16} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </form>
    </header>
  );
}
