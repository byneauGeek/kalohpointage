import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { urlSigneeFichierImport } from "@/lib/storage";

/** Redirige vers une URL signee temporaire (10 min) pour retelecharger le
 * fichier Excel original d'un import d'emploi du temps. */
export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const importLogId = Number(searchParams.get("importLogId"));
  if (!importLogId) return NextResponse.json({ erreur: "Parametre manquant." }, { status: 400 });

  const importLog = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!importLog?.cleStockageFichier) {
    return NextResponse.json({ erreur: "Fichier original indisponible pour cet import." }, { status: 404 });
  }

  const url = await urlSigneeFichierImport(importLog.cleStockageFichier);
  if (!url) return NextResponse.json({ erreur: "Stockage objet indisponible." }, { status: 503 });

  return NextResponse.redirect(url);
}
