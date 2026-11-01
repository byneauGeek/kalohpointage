import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { calculerComptabilisation } from "@/lib/comptabilisation";
import { genererRapportMensuelPdf } from "@/lib/rapportMensuelPdf";
import { resoudreMoisCalendaire } from "@/lib/moisCalendaire";

/** Rapport PDF des heures validees et montants dus d'un mois calendaire,
 * tous professeurs confondus - carte "Rapport du mois" du tableau de bord.
 * Mois en cours par defaut, ou ?periode=YYYY-MM pour un mois precedent -
 * sans lien avec les Periode (annee scolaire) qui n'offrent pas cette
 * granularite. */
export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { dateDebut, dateFin, moisLibelle, valeur } = resoudreMoisCalendaire(searchParams.get("periode"));

  const nomEtablissement = (await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } }))?.valeur ?? "Collège Privé Kaloh";
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const taux = Number(regle?.tauxHoraireGeneral ?? 0);

  const lignes = await calculerComptabilisation(dateDebut, dateFin, taux);

  const buffer = await genererRapportMensuelPdf({ nomEtablissement, moisLibelle, lignes });
  const nomFichier = `Rapport_Mensuel_${valeur}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichier}"`,
    },
  });
}
