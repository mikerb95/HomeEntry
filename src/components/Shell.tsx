import Link from "next/link";
import { Chrome, ChromeProps } from "./Chrome";
import { Toaster } from "./Toaster";

export function Shell({
  chrome,
  children,
}: {
  chrome?: ChromeProps;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {chrome && <Chrome {...chrome} />}
      <main className="pa-scroll flex-1 px-5 pb-16 pt-[26px]">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
      <LegalFooter />
      <Toaster />
    </div>
  );
}

// Discreet global footer with the legal links, present on every view (public
// and authenticated). Kept lightweight so it never competes with the panel UI.
function LegalFooter() {
  return (
    <footer className="border-t border-[#E2E8F1] px-5 py-5">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-2.5 text-[12.5px] font-semibold text-[#9AA4B2] sm:flex-row">
        <span>© {new Date().getFullYear()} La Oportunidad</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          <Link href="/legal/terminos" className="hover:text-ink">
            Términos y condiciones
          </Link>
          <span className="text-[#D2D9E3]">·</span>
          <Link href="/legal/privacidad" className="hover:text-ink">
            Privacidad
          </Link>
          <span className="text-[#D2D9E3]">·</span>
          <Link href="/legal/cookies" className="hover:text-ink">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
