import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Les routes /admin/* exigent une session ADMIN ou COMPTABLE. Le detail
// (COMPTABLE ne peut que consulter/controler) est verifie page par page /
// route par route cote serveur - jamais seulement par le masquage d'un lien
// (Journal_Decisions.md D11).
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-a-changer-en-production");

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const jwt = request.cookies.get("session")?.value;
  if (!jwt) return NextResponse.redirect(new URL("/login", request.url));

  try {
    await jwtVerify(jwt, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = { matcher: ["/admin/:path*"] };
