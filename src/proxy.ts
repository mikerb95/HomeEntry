import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Areas under /[conjunto]/<area> and the role each requires.
const ROLE_BY_AREA: Record<string, "resident" | "guard" | "admin"> = {
  residente: "resident",
  porteria: "guard",
  admin: "admin",
};

// Sub-routes inside an area that are public (no session needed yet).
const PUBLIC_SUB = new Set(["login", "registro"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const seg = pathname.split("/").filter(Boolean);

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Superadmin console (no conjunto in the path).
  if (seg[0] === "superadmin") {
    if (seg[1] === "login") return NextResponse.next();
    if (!session || session.role !== "superadmin") {
      return NextResponse.redirect(new URL("/superadmin/login", request.url));
    }
    return NextResponse.next();
  }

  // Tenant areas: /[slug]/[area]/...
  // Owner console (not scoped to a conjunto slug — an owner can hold units
  // across several conjuntos, so membership is checked per-page instead).
  if (seg[0] === "propietario") {
    if (seg[1] === "login") return NextResponse.next();
    if (!session || session.role !== "owner") {
      return NextResponse.redirect(new URL("/propietario/login", request.url));
    }
    return NextResponse.next();
  }

  const [slug, area, sub] = seg;
  const role = area ? ROLE_BY_AREA[area] : undefined;
  if (!role) return NextResponse.next(); // entry page, root, etc.
  if (PUBLIC_SUB.has(sub)) return NextResponse.next();

  // Optimistic check (the page-level require* helpers do the authoritative one,
  // including the session-version / revocation check against the DB).
  if (
    !session ||
    session.role !== role ||
    !("conjuntoSlug" in session) ||
    session.conjuntoSlug !== slug
  ) {
    return NextResponse.redirect(new URL(`/${slug}/${area}/login`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/propietario/:path*",
    "/:slug/residente/:path*",
    "/:slug/porteria/:path*",
    "/:slug/admin/:path*",
  ],
};
