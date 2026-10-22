import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { controlerRapport } from "@/lib/rapports";

export async function POST(request: Request) {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const { numeroRapport, codeVerification } = await request.json();
  const resultat = await controlerRapport(String(numeroRapport ?? "").trim(), String(codeVerification ?? "").trim());
  return NextResponse.json(resultat);
}
