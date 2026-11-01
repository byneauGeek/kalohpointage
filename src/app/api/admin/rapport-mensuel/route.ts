import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { calculerComptabilisation } from "@/lib/comptabilisation";
import { genererRapportMensuelPdf } from "@/lib/rapportMensuelPdf";

/** Rapport PDF des heures validees et montants dus du mois calendaire en
 * cours, tous professeurs confondus - carte "Rapport du mois" du tableau
 * de bord. Mois en cours calcule cote serveur (pas de parametre), sans lien
 * avec les Periode (annee scolaire) qui n'offrent pas cette granularite. */
export async function GET() {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const nomEtablissement = (await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } }))?.valeur ?? "Collège Privé Kaloh";
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const taux = Number(regle?.tauxHoraireGeneral ?? 0);

  const maintenant = new Date();
  const dateDebut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
  const dateFin = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const libelleBrut = maintenant.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const moisLibelle = libelleBrut.charAt(0).toUpperCase() + libelleBrut.slice(1);

  const lignes = await calculerComptabilisation(dateDebut, dateFin, taux);

  const buffer = await genererRapportMensuelPdf({ nomEtablissement, moisLibelle, lignes });
  const nomFichier = `Rapport_Mensuel_${maintenant.getUTCFullYear()}-${String(maintenant.getUTCMonth() + 1).padStart(2, "0")}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichier}"`,
    },
  });
}
