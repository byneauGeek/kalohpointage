/**
 * Portage de mdl_Validation (LOT 7) : un cours FIN_ENREGISTREE est valide
 * automatiquement si ses ecarts (arrivee/depart) restent dans les tolerances
 * configurees - la duree validee est alors la duree PREVUE, jamais la duree
 * reelle brute (regle metier §17, voir Specification_Version_Web.md §12).
 * Au-dela des tolerances (ou du retard maximal accepte), le cours passe
 * A_CONTROLER et attend une decision manuelle tracee (traiterAnomalie).
 */
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

function combinerDateEtMinutes(dateCours: Date, minutes: number): Date {
  const d = new Date(dateCours);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d;
}

function minutesEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function arrondirMinutes(valeur: number, pas: number, sens: "PLUS_PROCHE" | "INFERIEUR" | "SUPERIEUR"): number {
  if (pas <= 0) return valeur;
  const q = valeur / pas;
  const arrondi = sens === "INFERIEUR" ? Math.floor(q) : sens === "SUPERIEUR" ? Math.ceil(q) : Math.round(q);
  return arrondi * pas;
}

type Regle = {
  toleranceArriveeMin: number;
  toleranceDepartMin: number;
  retardMaxAccepteMin: number;
  arrondiMin: number;
  sensArrondi: "PLUS_PROCHE" | "INFERIEUR" | "SUPERIEUR";
};

export async function appliquerReglesValidation(regle: Regle) {
  const aTraiter = await prisma.cours.findMany({ where: { statut: "FIN_ENREGISTREE" } });
  let nbValides = 0;
  let nbAControler = 0;

  for (const c of aTraiter) {
    if (!c.heureArriveeReelle || !c.heureFinReelle) continue;
    const prevueDebut = combinerDateEtMinutes(c.dateCours, c.heureDebutPrevueMin);
    const prevueFin = combinerDateEtMinutes(c.dateCours, c.heureFinPrevueMin);
    const ecartArrivee = minutesEntre(prevueDebut, c.heureArriveeReelle); // +retard
    const ecartDepart = minutesEntre(prevueFin, c.heureFinReelle); // +parti tard, -parti tot
    const dureeReelle = minutesEntre(c.heureArriveeReelle, c.heureFinReelle);

    const dansLesTolerances =
      ecartArrivee <= regle.toleranceArriveeMin && Math.abs(ecartDepart) <= regle.toleranceDepartMin;

    if (dansLesTolerances) {
      await prisma.cours.update({
        where: { id: c.id },
        data: {
          ecartArriveeMin: ecartArrivee,
          ecartDepartMin: ecartDepart,
          dureeReelleMin: dureeReelle,
          dureeValideeMin: arrondirMinutes(c.dureePrevueMin, regle.arrondiMin, regle.sensArrondi),
          statut: "VALIDE",
          dateValidation: new Date(),
        },
      });
      nbValides++;
    } else {
      await prisma.cours.update({
        where: { id: c.id },
        data: {
          ecartArriveeMin: ecartArrivee,
          ecartDepartMin: ecartDepart,
          dureeReelleMin: dureeReelle,
          statut: "A_CONTROLER",
        },
      });
      nbAControler++;
    }
  }

  return { nbValides, nbAControler };
}

/** Decision manuelle de l'administrateur sur un cours A_CONTROLER - motif
 * TOUJOURS obligatoire, toujours tracee a l'audit (jamais d'ecrasement
 * silencieux, regle metier intangible). */
export async function traiterAnomalie(params: {
  coursId: number;
  decision: "VALIDER" | "REJETER";
  dureeValideeMin?: number;
  motif: string;
  utilisateurId: number;
}) {
  if (!params.motif || params.motif.trim() === "") {
    throw new Error("Motif obligatoire pour traiter une anomalie.");
  }
  const cours = await prisma.cours.findUniqueOrThrow({ where: { id: params.coursId } });
  const nouveauStatut = params.decision === "VALIDER" ? "VALIDE" : "NON_VALIDE";

  await prisma.cours.update({
    where: { id: params.coursId },
    data: {
      statut: nouveauStatut,
      dureeValideeMin: params.decision === "VALIDER" ? params.dureeValideeMin ?? cours.dureePrevueMin : null,
      motifValidation: params.motif,
      dateValidation: new Date(),
      validateurId: params.utilisateurId,
    },
  });

  await enregistrerAudit({
    utilisateurId: params.utilisateurId,
    action: "VALIDATION_EXCEPTIONNELLE",
    tableConcernee: "cours",
    idEnregistrement: params.coursId,
    ancienneValeur: cours.statut,
    nouvelleValeur: nouveauStatut,
    motif: params.motif,
  });
}
