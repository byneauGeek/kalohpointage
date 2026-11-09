/**
 * Portage de mdl_Comptabilisation (LOT 15, D64) : seules les heures VALIDEES
 * comptent. Vacataire = heures validees x taux. Permanent = salaire fixe +
 * heures supplementaires (au-dela du quota) x taux. Un statut non reconnu
 * est traite comme Vacataire et SIGNALE (jamais silencieusement), de meme
 * qu'un permanent sans salaire fixe ou sans quota.
 */
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

/** Comment compter les heures d'un professeur qui enseigne UNE MATIERE
 * donnee a plusieurs classes en simultane sur un meme creneau (ex.
 * 3e1/3e2/3e3 en meme temps - voir emploi du temps, qui l'autorise).
 * PAR_CLASSE (defaut, comportement historique) compte chaque classe
 * separement : un vacataire est alors paye pour chaque classe prise en
 * charge. UNE_FOIS_PAR_CRENEAU ne compte le temps qu'une fois par plage
 * horaire couverte, quel que soit le nombre de classes simultanees -
 * pertinent notamment pour un permanent, dont le quota/les heures sup
 * doivent refleter le temps reellement passe, pas le nombre de classes
 * couvertes au meme moment. PARAMETRABLE PAR MATIERE (pas globalement, voir
 * /admin/matieres) : une matiere peut avoir une logique differente d'une
 * autre pour ce meme professeur. */
export type ModeComptageSimultane = "PAR_CLASSE" | "UNE_FOIS_PAR_CRENEAU";

type CoursPourDedoublonnage = {
  dateCours: Date;
  heureDebutPrevueMin: number;
  heureFinPrevueMin: number;
  dureeValideeMin: number | null;
  matiereId: number;
  matiere: { modeComptageSimultane: string };
};

/** Additionne dureeValideeMin sur l'ensemble des cours d'un professeur,
 * matiere par matiere (chaque matiere a son propre mode de comptage des
 * classes simultanees - voir ModeComptageSimultane). Pour une matiere en
 * UNE_FOIS_PAR_CRENEAU : regroupe les cours de CETTE matiere qui se
 * chevauchent (ou s'enchainent, meme jour) en grappes, et ne retient que la
 * duree validee la plus longue de chaque grappe plutot que leur somme.
 * Pour PAR_CLASSE (defaut) : simple somme, chaque classe comptant
 * separement. */
function minutesValideesParProfesseur(cours: CoursPourDedoublonnage[]): number {
  const parMatiere = new Map<number, CoursPourDedoublonnage[]>();
  for (const c of cours) {
    if (!parMatiere.has(c.matiereId)) parMatiere.set(c.matiereId, []);
    parMatiere.get(c.matiereId)!.push(c);
  }

  let total = 0;
  for (const coursDeLaMatiere of parMatiere.values()) {
    const mode: ModeComptageSimultane =
      coursDeLaMatiere[0].matiere.modeComptageSimultane === "UNE_FOIS_PAR_CRENEAU" ? "UNE_FOIS_PAR_CRENEAU" : "PAR_CLASSE";
    if (mode === "PAR_CLASSE") {
      total += coursDeLaMatiere.reduce((s, c) => s + (c.dureeValideeMin ?? 0), 0);
      continue;
    }

    const parJour = new Map<string, CoursPourDedoublonnage[]>();
    for (const c of coursDeLaMatiere) {
      const cle = c.dateCours.toISOString().slice(0, 10);
      if (!parJour.has(cle)) parJour.set(cle, []);
      parJour.get(cle)!.push(c);
    }

    for (const coursDuJour of parJour.values()) {
      const tries = [...coursDuJour].sort((a, b) => a.heureDebutPrevueMin - b.heureDebutPrevueMin);
      let grappeFin = -Infinity;
      let grappeMax = 0;
      for (const c of tries) {
        if (c.heureDebutPrevueMin > grappeFin) {
          total += grappeMax;
          grappeMax = 0;
        }
        grappeMax = Math.max(grappeMax, c.dureeValideeMin ?? 0);
        grappeFin = Math.max(grappeFin, c.heureFinPrevueMin);
      }
      total += grappeMax;
    }
  }
  return total;
}

export type LigneComptabilisation = {
  professeurId: number;
  matricule: string;
  nom: string;
  prenom: string;
  statut: string;
  minutesValidees: number;
  quotaMin: number | null;
  minutesSupp: number;
  tauxApplique: number;
  salaireFixe: number;
  montantSupp: number;
  montant: number;
  avertissements: string[];
};

export async function calculerComptabilisation(
  dateDebut: Date,
  dateFin: Date,
  tauxHoraireGeneral: number,
  periodeId?: number
): Promise<LigneComptabilisation[]> {
  const professeurs = await prisma.professeur.findMany({ where: { actif: true } });

  // Heures saisies manuellement (rattrapage pre-mise en service, voir
  // src/app/admin/heures-manuelles) - regroupees par professeur pour un
  // ajout simple aux minutes automatiques ci-dessous. Avec periodeId
  // (comptabilisation par Periode / annee scolaire) : TOUTES les saisies de
  // cette periode, quelle que soit leur date - une saisie de rattrapage est
  // par construction souvent datee AVANT le debut officiel de la periode
  // (ex. periode "26-27" ouverte le 23/10/2026, rattrapage pour des heures
  // du 1er au 22/10). Sans periodeId (rapport mensuel, fiche d'emargement,
  // qui raisonnent en mois calendaire et n'ont pas de Periode a cette
  // granularite) : les saisies dont le jour tombe dans la plage demandee.
  const minutesManuellesParProf = new Map<number, number>();
  const saisies = await prisma.saisieHeuresManuelle.findMany({
    where: periodeId ? { periodeId } : { date: { gte: dateDebut, lte: dateFin } },
  });
  for (const s of saisies) {
    minutesManuellesParProf.set(s.professeurId, (minutesManuellesParProf.get(s.professeurId) ?? 0) + s.dureeMin);
  }

  const lignes: LigneComptabilisation[] = [];

  for (const prof of professeurs) {
    const coursValides = await prisma.cours.findMany({
      where: {
        professeurId: prof.id,
        statut: "VALIDE",
        dateCours: { gte: dateDebut, lte: dateFin },
      },
      select: {
        dateCours: true,
        heureDebutPrevueMin: true,
        heureFinPrevueMin: true,
        dureeValideeMin: true,
        matiereId: true,
        matiere: { select: { modeComptageSimultane: true } },
      },
    });
    const minutesManuelles = minutesManuellesParProf.get(prof.id) ?? 0;
    const minutesCours = minutesValideesParProfesseur(coursValides);
    const minutesValidees = minutesCours + minutesManuelles;
    const avertissements: string[] = [];
    if (minutesManuelles > 0) {
      avertissements.push(`Inclut ${(minutesManuelles / 60).toFixed(2)} h saisies manuellement.`);
    }

    const taux = prof.tauxHoraireSpecifique ? Number(prof.tauxHoraireSpecifique) : tauxHoraireGeneral;

    let statutEffectif = prof.statut;
    if (statutEffectif !== "PERMANENT" && statutEffectif !== "VACATAIRE") {
      avertissements.push(`Statut non reconnu ('${prof.statut}') : traite comme Vacataire.`);
      statutEffectif = "VACATAIRE";
    }

    let montant = 0;
    let salaireFixe = 0;
    let minutesSupp = 0;
    let quotaMin: number | null = null;

    if (statutEffectif === "PERMANENT") {
      if (!prof.salaireFixeMensuel || !prof.quotaHeuresMensuelMin) {
        avertissements.push("Permanent sans salaire fixe ou sans quota configure : traite comme Vacataire.");
        montant = (minutesValidees / 60) * taux;
      } else {
        salaireFixe = Number(prof.salaireFixeMensuel);
        quotaMin = prof.quotaHeuresMensuelMin;
        minutesSupp = Math.max(0, minutesValidees - quotaMin);
        const montantSupp = (minutesSupp / 60) * taux;
        montant = salaireFixe + montantSupp;
        lignes.push({
          professeurId: prof.id,
          matricule: prof.matricule,
          nom: prof.nom,
          prenom: prof.prenom,
          statut: prof.statut,
          minutesValidees,
          quotaMin,
          minutesSupp,
          tauxApplique: taux,
          salaireFixe,
          montantSupp,
          montant,
          avertissements,
        });
        continue;
      }
    } else {
      montant = (minutesValidees / 60) * taux;
    }

    lignes.push({
      professeurId: prof.id,
      matricule: prof.matricule,
      nom: prof.nom,
      prenom: prof.prenom,
      statut: prof.statut,
      minutesValidees,
      quotaMin,
      minutesSupp,
      tauxApplique: taux,
      salaireFixe,
      montantSupp: 0,
      montant,
      avertissements,
    });
  }

  return lignes;
}

export function decimalVersNombre(d: Decimal | number | null): number {
  if (d === null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export type SessionDetail = {
  date: Date;
  matiere: string;
  classe: string;
  dureeValideeMin: number;
};

export type DetailParMatiere = { matiere: string; minutes: number };

export type SaisieManuelleDetail = {
  date: Date;
  heureArriveeMin: number;
  heureDepartMin: number;
  dureeMin: number;
  motif: string;
};

/** Detail session par session d'un professeur sur une plage de dates - un
 * professeur peut enseigner plusieurs matieres (chaque creneau porte sa
 * propre matiere) : indispensable pour que la fiche de paie montre la
 * matiere de chaque session effectuee, pas seulement un total global.
 * Inclut aussi les heures saisies manuellement (voir calculerComptabilisation
 * pour le choix periodeId vs date), listees separement : ce ne sont pas des
 * sessions reelles avec une classe/matiere, juste un rattrapage global. */
export async function detailSessionsProfesseur(
  professeurId: number,
  dateDebut: Date,
  dateFin: Date,
  periodeId?: number
): Promise<{ sessions: SessionDetail[]; parMatiere: DetailParMatiere[]; manuelles: SaisieManuelleDetail[] }> {
  const cours = await prisma.cours.findMany({
    where: { professeurId, statut: "VALIDE", dateCours: { gte: dateDebut, lte: dateFin } },
    include: { matiere: true, classe: true },
    orderBy: [{ dateCours: "asc" }, { heureDebutPrevueMin: "asc" }],
  });

  const sessions: SessionDetail[] = cours.map((c) => ({
    date: c.dateCours,
    matiere: c.matiere.libelle,
    classe: c.classe.nomClasse,
    dureeValideeMin: c.dureeValideeMin ?? 0,
  }));

  const totauxParMatiere = new Map<string, number>();
  for (const s of sessions) {
    totauxParMatiere.set(s.matiere, (totauxParMatiere.get(s.matiere) ?? 0) + s.dureeValideeMin);
  }
  const parMatiere = Array.from(totauxParMatiere, ([matiere, minutes]) => ({ matiere, minutes }));

  const manuelles: SaisieManuelleDetail[] = (
    await prisma.saisieHeuresManuelle.findMany({
      where: periodeId ? { professeurId, periodeId } : { professeurId, date: { gte: dateDebut, lte: dateFin } },
      orderBy: { date: "asc" },
    })
  ).map((s) => ({
    date: s.date,
    heureArriveeMin: s.heureArriveeMin,
    heureDepartMin: s.heureDepartMin,
    dureeMin: s.dureeMin,
    motif: s.motif,
  }));

  return { sessions, parMatiere, manuelles };
}

/** Matiere(s) exactes d'un professeur sur une plage de dates : celles de ses
 * Cours valides, et celles de ses saisies manuelles qui en precisent une
 * (voir src/app/admin/heures-manuelles - seule source de matiere possible
 * pour un professeur sans Cours ni EmploiDuTemps, puisque les heures
 * manuelles n'ont pas d'autre lien vers une classe/matiere). Utilisee par la
 * fiche d'emargement avant de retomber sur matieresEnseigneesProfesseur
 * (emploi du temps, moins precis car pas specifique a la periode). */
export async function matieresExactesProfesseur(professeurId: number, dateDebut: Date, dateFin: Date): Promise<string[]> {
  const [cours, saisies] = await Promise.all([
    prisma.cours.findMany({
      where: { professeurId, statut: "VALIDE", dateCours: { gte: dateDebut, lte: dateFin } },
      select: { matiere: { select: { libelle: true } } },
    }),
    prisma.saisieHeuresManuelle.findMany({
      where: { professeurId, matiereId: { not: null }, date: { gte: dateDebut, lte: dateFin } },
      select: { matiere: { select: { libelle: true } } },
    }),
  ]);
  const libelles = [...cours.map((c) => c.matiere.libelle), ...saisies.map((s) => s.matiere!.libelle)];
  return Array.from(new Set(libelles));
}

/** Matiere(s) qu'un professeur est cense enseigner sur une plage de dates,
 * d'apres son emploi du temps actif (et non les Cours valides, qui peuvent
 * etre absents quand les heures sont uniquement suivies via la saisie
 * manuelle - voir src/app/admin/heures-manuelles, qui n'a pas de champ
 * matiere) - utilisee par la fiche d'emargement pour afficher une matiere
 * meme quand aucune session automatique n'a ete validee. Un creneau est
 * retenu s'il etait actif a un moment de la plage (dateDebutValidite <=
 * dateFin et, sans date de fin ou avec une date de fin posterieure a
 * dateDebut). */
export async function matieresEnseigneesProfesseur(professeurId: number, dateDebut: Date, dateFin: Date): Promise<string[]> {
  const creneaux = await prisma.emploiDuTemps.findMany({
    where: {
      professeurId,
      actif: true,
      dateDebutValidite: { lte: dateFin },
      OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: dateDebut } }],
    },
    include: { matiere: true },
  });
  return Array.from(new Set(creneaux.map((c) => c.matiere.libelle)));
}
