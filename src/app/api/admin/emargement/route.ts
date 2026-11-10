import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { calculerComptabilisation, matieresExactesProfesseur, matieresEnseigneesProfesseur } from "@/lib/comptabilisation";
import { genererEmargementPdf, type LigneEmargement } from "@/lib/emargementPdf";
import { resoudreMoisCalendaire } from "@/lib/moisCalendaire";

/** Fiche d'emargement PDF d'un mois calendaire - carte "Fiche d'emargement"
 * du tableau de bord. Mois en cours par defaut, ou ?periode=YYYY-MM pour un
 * mois precedent. Un professeur par ligne (nom et prenoms, matiere(s)
 * enseignee(s), heures totales, montant du, case signature vide),
 * uniquement ceux ayant un montant du ce mois-la - signer pour 0 h / 0 FCFA
 * n'a pas de sens. Filtre sur le montant et non sur les minutes : un
 * professeur PERMANENT touche son salaire fixe meme a 0h un mois donne, il
 * doit donc rester sur la fiche (voir calculerComptabilisation) - sinon son
 * montant serait absent ici tout en comptant dans le total du rapport
 * mensuel (meme calcul, memes lignes), ce qui desynchroniserait les deux
 * documents. */
export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { dateDebut, dateFin, moisLibelle, valeur } = resoudreMoisCalendaire(searchParams.get("periode"));

  const nomEtablissement = (await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } }))?.valeur ?? "Collège Privé Kaloh";
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const taux = Number(regle?.tauxHoraireGeneral ?? 0);

  const toutesLesLignes = await calculerComptabilisation(dateDebut, dateFin, taux);
  const lignesAvecHeures = toutesLesLignes.filter((l) => l.minutesValidees > 0 || l.montant > 0);

  const lignes: LigneEmargement[] = await Promise.all(
    lignesAvecHeures.map(async (l) => {
      // Matiere exacte d'abord (Cours valides ou saisie manuelle qui en
      // precise une) ; a defaut, on retombe sur l'emploi du temps du
      // professeur (moins precis, mais mieux qu'une case vide) ; en dernier
      // recours, la matiere principale saisie sur sa fiche (voir
      // /admin/professeurs/[id]) - evite un "--" quand aucune des deux
      // sources automatiques n'a de matiere pour ce mois.
      const matieresExactes = await matieresExactesProfesseur(l.professeurId, dateDebut, dateFin);
      let matieres = matieresExactes.length > 0
        ? matieresExactes
        : await matieresEnseigneesProfesseur(l.professeurId, dateDebut, dateFin);
      if (matieres.length === 0) {
        const prof = await prisma.professeur.findUnique({
          where: { id: l.professeurId },
          select: { matiere: { select: { libelle: true } } },
        });
        if (prof?.matiere) matieres = [prof.matiere.libelle];
      }
      return {
        matricule: l.matricule,
        nom: l.nom,
        prenom: l.prenom,
        matieres: matieres.join(", "),
        minutesValidees: l.minutesValidees,
        montant: l.montant,
      };
    })
  );

  const buffer = await genererEmargementPdf({ nomEtablissement, moisLibelle, lignes });
  const nomFichier = `Emargement_${valeur}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichier}"`,
    },
  });
}
