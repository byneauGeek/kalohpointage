/**
 * Portage de mdl_Comptabilisation (LOT 15, D64) : seules les heures VALIDEES
 * comptent. Vacataire = heures validees x taux. Permanent = salaire fixe +
 * heures supplementaires (au-dela du quota) x taux. Un statut non reconnu
 * est traite comme Vacataire et SIGNALE (jamais silencieusement), de meme
 * qu'un permanent sans salaire fixe ou sans quota.
 */
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

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

  // Heures saisies manuellement pour cette periode (rattrapage pre-mise en
  // service, voir src/app/admin/heures-manuelles) - regroupees par
  // professeur pour un ajout simple aux minutes automatiques ci-dessous.
  const minutesManuellesParProf = new Map<number, number>();
  if (periodeId) {
    const saisies = await prisma.saisieHeuresManuelle.findMany({ where: { periodeId } });
    for (const s of saisies) {
      minutesManuellesParProf.set(s.professeurId, (minutesManuellesParProf.get(s.professeurId) ?? 0) + s.dureeMin);
    }
  }

  const lignes: LigneComptabilisation[] = [];

  for (const prof of professeurs) {
    const coursValides = await prisma.cours.findMany({
      where: {
        professeurId: prof.id,
        statut: "VALIDE",
        dateCours: { gte: dateDebut, lte: dateFin },
      },
      select: { dureeValideeMin: true },
    });
    const minutesManuelles = minutesManuellesParProf.get(prof.id) ?? 0;
    const minutesValidees = coursValides.reduce((s, c) => s + (c.dureeValideeMin ?? 0), 0) + minutesManuelles;
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

/** Detail session par session d'un professeur sur une periode - un
 * professeur peut enseigner plusieurs matieres (chaque creneau porte sa
 * propre matiere) : indispensable pour que la fiche de paie montre la
 * matiere de chaque session effectuee, pas seulement un total global.
 * Inclut aussi les heures saisies manuellement sur CETTE periode (voir
 * calculerComptabilisation), listees separement : ce ne sont pas des
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

  const manuelles: SaisieManuelleDetail[] = periodeId
    ? (
        await prisma.saisieHeuresManuelle.findMany({
          where: { professeurId, periodeId },
          orderBy: { date: "asc" },
        })
      ).map((s) => ({
        date: s.date,
        heureArriveeMin: s.heureArriveeMin,
        heureDepartMin: s.heureDepartMin,
        dureeMin: s.dureeMin,
        motif: s.motif,
      }))
    : [];

  return { sessions, parMatiere, manuelles };
}
