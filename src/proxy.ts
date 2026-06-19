import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Routes that require a specific role. Login/public routes are omitted.
const RULES: { prefix: string; role: "resident" | "guard" | "admin"; login: string }[] = [
  { prefix: "/residente/autorizar", role: "resident", login: "/residente/login" },
  { prefix: "/residente", role: "resident", login: "/residente/login" },
  { prefix: "/porteria", role: "guard", login: "/porteria/login" },
  { prefix: "/admin", role: "admin", login: "/admin/login" },
];

const PUBLIC = new Set([
  "/residente/login",
  "/residente/registro",
  "/porteria/login",
  "/admin/login",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();

  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.role !== rule.role) {
    return NextResponse.redirect(new URL(rule.login, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/residente/:path*", "/porteria/:path*", "/admin/:path*"],
};
