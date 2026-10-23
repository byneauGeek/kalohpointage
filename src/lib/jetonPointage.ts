/**
 * Code quotidien (24h) protegeant l'acces au poste de pointage kiosque -
 * demande explicite de l'etablissement : un code genere depuis l'espace
 * admin doit etre saisi une fois par APPAREIL (pas par professeur - le PIN
 * s'en charge deja juste apres). Une fois valide, l'appareil est marque
 * "de confiance" via un cookie signe jusqu'a l'expiration du jeton saisi -
 * si l'admin en genere un nouveau avant l'expiration, l'ancien (et donc la
 * confiance accordee pour lui) devient caduc immediatement.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-a-changer-en-production");
const COOKIE_APPAREIL = "pointage_appareil";
const COOKIE_TENTATIVES = "pointage_tentatives";
export const DUREE_JETON_HEURES = 24;
const MAX_TENTATIVES_CODE = 8;
const FENETRE_TENTATIVES_MIN = 15;

function genererCode(): string {
  // 6 chiffres : facile a lire et a saisir sur un clavier tactile kiosque.
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function genererJetonPointage(utilisateurId: number) {
  const code = genererCode();
  const expireLe = new Date(Date.now() + DUREE_JETON_HEURES * 60 * 60 * 1000);
  return prisma.jetonPointage.create({ data: { code, expireLe, genereParId: utilisateurId } });
}

/** Le jeton le plus recent, s'il n'est pas expire - null sinon (y compris
 * s'il n'y en a jamais eu). Un nouveau jeton rend tous les precedents
 * caducs des sa creation, qu'ils soient expires ou non. */
export async function jetonActif() {
  const jeton = await prisma.jetonPointage.findFirst({ orderBy: { genereLe: "desc" } });
  if (!jeton || jeton.expireLe <= new Date()) return null;
  return jeton;
}

async function creerCookieAppareil(jetonId: number, expireLe: Date) {
  const jwt = await new SignJWT({ jetonId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expireLe.getTime() / 1000))
    .sign(SECRET);
  const store = await cookies();
  store.set(COOKIE_APPAREIL, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expireLe,
  });
}

export async function appareilDeConfiance(): Promise<boolean> {
  const actif = await jetonActif();
  if (!actif) return false;
  const store = await cookies();
  const jwt = store.get(COOKIE_APPAREIL)?.value;
  if (!jwt) return false;
  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    return (payload as { jetonId?: number }).jetonId === actif.id;
  } catch {
    return false;
  }
}

type Tentatives = { nombre: number; depuis: number };

async function lireTentatives(): Promise<Tentatives> {
  const store = await cookies();
  const brut = store.get(COOKIE_TENTATIVES)?.value;
  if (!brut) return { nombre: 0, depuis: Date.now() };
  try {
    const t = JSON.parse(brut) as Tentatives;
    if (Date.now() - t.depuis > FENETRE_TENTATIVES_MIN * 60000) return { nombre: 0, depuis: Date.now() };
    return t;
  } catch {
    return { nombre: 0, depuis: Date.now() };
  }
}

async function ecrireTentatives(t: Tentatives) {
  const store = await cookies();
  store.set(COOKIE_TENTATIVES, JSON.stringify(t), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FENETRE_TENTATIVES_MIN * 60,
  });
}

/** Verifie le code saisi pour CET appareil ; protection anti-brute-force
 * simple par compteur cote cookie (ce gate n'est pas la protection
 * principale des donnees - le PIN professeur s'en charge juste apres -
 * mais merite quand meme un frein contre un script qui tenterait les
 * 900000 combinaisons possibles). */
export async function validerCodeAppareil(code: string): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const tentatives = await lireTentatives();
  if (tentatives.nombre >= MAX_TENTATIVES_CODE) {
    return { ok: false, erreur: `Trop de tentatives. Réessayez dans ${FENETRE_TENTATIVES_MIN} minutes.` };
  }

  const actif = await jetonActif();
  if (!actif || actif.code !== code.trim()) {
    await ecrireTentatives({ nombre: tentatives.nombre + 1, depuis: tentatives.depuis });
    return { ok: false, erreur: "Code incorrect." };
  }

  await creerCookieAppareil(actif.id, actif.expireLe);
  await ecrireTentatives({ nombre: 0, depuis: Date.now() });
  return { ok: true };
}
