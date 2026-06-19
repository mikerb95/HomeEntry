import { logout } from "@/app/actions/auth";
import { IconLogout } from "./icons";

export type ChromeProps = {
  title: string;
  sub: string;
  role: string;
  badgeBg: string;
  badgeFg: string;
};

export function Chrome({ title, sub, role, badgeBg, badgeFg }: ChromeProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3.5 border-b border-[#E2E8F1] bg-white/90 px-5 py-[11px] backdrop-blur-[14px]">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-ink font-display text-[17px] font-bold text-white">
          P
        </div>
        <div className="min-w-0 leading-[1.15]">
          <div className="truncate font-display text-[15px] font-bold tracking-[-.2px]">
            {title}
          </div>
          <div className="text-[11.5px] font-semibold text-[#8A94A3]">{sub}</div>
        </div>
      </div>
      <span
        className="flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[11.5px] font-bold"
        style={{ background: badgeBg, color: badgeFg }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {role}
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-[7px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-2 text-[13px] font-bold text-[#5B6675] hover:bg-[#F6F8FB] hover:text-ink"
        >
          <IconLogout size={15} />
          Salir
        </button>
      </form>
    </header>
  );
}
