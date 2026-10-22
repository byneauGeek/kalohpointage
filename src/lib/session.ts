/**
 * Deux mecanismes de session bien distincts, fideles au comportement Access :
 *
 * 1. Session ADMIN/COMPTABLE classique : cookie httpOnly signe, duree normale
 *    de travail (8h), comme toute application web.
 *
 * 2. Jeton d'ACTION professeur (kiosque) : jamais une session persistante.
 *    Verifie le PIN, autorise UNE SEULE action de pointage (arrivee ou fin)
 *    dans les 2 minutes qui suivent, puis devient inutilisable - fidele au
 *    principe Access "pas de session professeur qui reste ouverte sur un
 *    poste partage" (voir Specification_Version_Web.md §5, Analyse
 *    Fonctionnelle D02-D04).
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-a-changer-en-production");
const COOKIE_SESSION = "session";

export type SessionPayload = { userId: number; role: "ADMIN" | "COMPTABLE" };

export async function creerSession(payload: SessionPayload) {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
  const store = await cookies();
  store.set(COOKIE_SESSION, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function lireSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const jwt = store.get(COOKIE_SESSION)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function detruireSession() {
  const store = await cookies();
  store.delete(COOKIE_SESSION);
}

export type ActionPayload = { professeurId: number; coursId: number; action: "ARRIVEE" | "FIN" };

export async function creerJetonAction(payload: ActionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(SECRET);
}

export async function verifierJetonAction(jwt: string): Promise<ActionPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    return payload as unknown as ActionPayload;
  } catch {
    return null;
  }
}
