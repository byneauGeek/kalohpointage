import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { calculerComptabilisation, detailSessionsProfesseur } from "@/lib/comptabilisation";
import { genererEmargementPdf, type LigneEmargement } from "@/lib/emargementPdf";

/** Fiche d'emargement PDF du mois calendaire en cours - carte "Fiche
 * d'emargement" du tableau de bord. Un professeur par ligne (nom et
 * prenoms, matiere(s) enseignee(s), heures totales, montant du, case
 * signature vide), uniquement ceux ayant des heures validees ce mois-ci -
 * signer pour 0 h / 0 FCFA n'a pas de sens. */
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

  const toutesLesLignes = await calculerComptabilisation(dateDebut, dateFin, taux);
  const lignesAvecHeures = toutesLesLignes.filter((l) => l.minutesValidees > 0);

  const lignes: LigneEmargement[] = await Promise.all(
    lignesAvecHeures.map(async (l) => {
      const { parMatiere } = await detailSessionsProfesseur(l.professeurId, dateDebut, dateFin);
      return {
        matricule: l.matricule,
        nom: l.nom,
        prenom: l.prenom,
        matieres: parMatiere.map((m) => m.matiere).join(", "),
        minutesValidees: l.minutesValidees,
        montant: l.montant,
      };
    })
  );

  const buffer = await genererEmargementPdf({ nomEtablissement, moisLibelle, lignes });
  const nomFichier = `Emargement_${maintenant.getUTCFullYear()}-${String(maintenant.getUTCMonth() + 1).padStart(2, "0")}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichier}"`,
    },
  });
}
