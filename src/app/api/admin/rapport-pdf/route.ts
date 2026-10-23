import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { genererRapportPdf } from "@/lib/rapportPdf";

export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const rapportId = Number(searchParams.get("rapportId"));
  if (!rapportId) return NextResponse.json({ erreur: "Parametre manquant." }, { status: 400 });

  const rapport = await prisma.rapport.findUnique({ where: { id: rapportId }, include: { periode: true } });
  if (!rapport) return NextResponse.json({ erreur: "Rapport introuvable." }, { status: 404 });

  const nomEtablissement = (await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } }))?.valeur ?? "Collège Privé Kaloh";
  const donnees = JSON.parse(rapport.donneesCanoniquesJson) as { lignes: Array<Record<string, unknown>> };

  const buffer = await genererRapportPdf({
    nomEtablissement,
    numeroRapport: rapport.numeroRapport,
    version: rapport.version,
    typeRapport: rapport.typeRapport,
    periodeLibelle: rapport.periode.libelle,
    dateGeneration: rapport.dateGeneration,
    codeVerification: rapport.codeVerification,
    hashRapport: rapport.hashRapport,
    heuresTotalesMin: rapport.heuresTotalesMin,
    montantTotal: rapport.montantTotal ? Number(rapport.montantTotal) : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lignes: donnees.lignes as any,
  });

  const nomFichier = `${rapport.numeroRapport}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
