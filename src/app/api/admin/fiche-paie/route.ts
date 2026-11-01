import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { calculerComptabilisation, detailSessionsProfesseur } from "@/lib/comptabilisation";
import { genererFicheDePaieDocx } from "@/lib/ficheDePaie";
import { genererFicheDePaiePdf } from "@/lib/ficheDePaiePdf";

export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const professeurId = Number(searchParams.get("professeurId"));
  const periodeId = Number(searchParams.get("periodeId"));
  if (!professeurId || !periodeId) {
    return NextResponse.json({ erreur: "Parametres manquants." }, { status: 400 });
  }

  const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
  if (!periode) return NextResponse.json({ erreur: "Periode introuvable." }, { status: 404 });

  const nomEtablissement = (await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } }))?.valeur ?? "Collège Privé Kaloh";
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const taux = periode.tauxHoraireApplique ? Number(periode.tauxHoraireApplique) : Number(regle?.tauxHoraireGeneral ?? 0);

  const lignes = await calculerComptabilisation(periode.dateDebut, periode.dateFin, taux, periode.id);
  const ligne = lignes.find((l) => l.professeurId === professeurId);
  if (!ligne) return NextResponse.json({ erreur: "Professeur sans donnees sur cette periode." }, { status: 404 });

  const { sessions, parMatiere, manuelles } = await detailSessionsProfesseur(professeurId, periode.dateDebut, periode.dateFin, periode.id);

  const format = searchParams.get("format") === "pdf" ? "pdf" : "docx";
  const donnees = { nomEtablissement, periodeLibelle: periode.libelle, ligne, sessions, parMatiere, manuelles };

  if (format === "pdf") {
    const buffer = await genererFicheDePaiePdf(donnees);
    const nomFichier = `Fiche_Paie_${ligne.matricule}_${periode.libelle}.pdf`;
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomFichier}"`,
      },
    });
  }

  const buffer = await genererFicheDePaieDocx(donnees);
  const nomFichier = `Fiche_Paie_${ligne.matricule}_${periode.libelle}.docx`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
