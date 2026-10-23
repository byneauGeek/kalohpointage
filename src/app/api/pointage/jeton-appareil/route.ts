import { NextResponse } from "next/server";
import { appareilDeConfiance, validerCodeAppareil } from "@/lib/jetonPointage";

/** L'ecran de pointage interroge cette route au chargement pour savoir si
 * CET appareil a deja valide le code du jour. */
export async function GET() {
  const confiance = await appareilDeConfiance();
  return NextResponse.json({ confiance });
}

/** Saisie du code par l'utilisateur du kiosque. */
export async function POST(request: Request) {
  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ ok: false, erreur: "Code manquant." }, { status: 400 });
  }
  const resultat = await validerCodeAppareil(code);
  if (!resultat.ok) {
    return NextResponse.json(resultat, { status: 401 });
  }
  return NextResponse.json(resultat);
}
