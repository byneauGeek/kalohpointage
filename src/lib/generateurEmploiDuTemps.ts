/**
 * Generateur automatique d'emploi du temps : CSP resolu par un algorithme
 * glouton avec ordonnancement intelligent (les seances les plus difficiles a
 * placer en premier) plutot qu'un backtracking exhaustif - a cette echelle
 * (quelques classes, quelques dizaines de professeurs, ~45 creneaux/semaine)
 * c'est largement suffisant, et surtout borne en temps (jamais d'explosion
 * combinatoire), ce qui compte pour une fonction serverless. Toute seance
 * qu'il ne peut pas placer est clairement rapportee plutot que de produire
 * un resultat errone - voir ResultatGeneration.nonPlacees.
 *
 * Contraintes dures (jamais violees) : une classe et un professeur ne sont
 * jamais doubles sur le meme (jour, periode) ; un professeur n'est jamais
 * place sur son indisponibilite ; le plafond de seances identiques/jour et
 * le plafond de periodes/jour par professeur sont respectes.
 *
 * Contraintes souples (optimisees, jamais garanties) : eviter les periodes
 * marquees "a eviter" pour une matiere, repartir les seances d'une meme
 * matiere sur plusieurs jours plutot que de les grouper, minimiser les
 * trous dans la journee d'un professeur.
 */

export type PeriodeEntree = { id: number; ordre: number; heureDebutMin: number; heureFinMin: number };
export type AffectationEntree = {
  id: number;
  classeId: number;
  matiereId: number;
  professeurId: number;
  seancesParSemaine: number;
};
export type IndisponibiliteEntree = { professeurId: number; jourSemaine: number; periodeGrilleId: number };
export type ReglesGenerateur = { maxSeancesMemeMatiereParJour: number; maxPeriodesParJourProfesseur: number };

export type EntreeGenerateur = {
  periodes: PeriodeEntree[];
  affectations: AffectationEntree[];
  indisponibilites: IndisponibiliteEntree[];
  periodesEviteesParMatiere: Map<number, Set<number>>; // matiereId -> set de periodeGrilleId
  regles: ReglesGenerateur;
  jours?: number[]; // defaut : lundi-vendredi
};

export type PlacementGenere = {
  affectationId: number;
  classeId: number;
  matiereId: number;
  professeurId: number;
  jourSemaine: number;
  periodeGrilleId: number;
  heureDebutMin: number;
  heureFinMin: number;
};

export type SeanceNonPlacee = {
  affectationId: number;
  classeId: number;
  matiereId: number;
  professeurId: number;
  motif: string;
};

export type ResultatGeneration = {
  placements: PlacementGenere[];
  nonPlacees: SeanceNonPlacee[];
};

const JOURS_DEFAUT = [1, 2, 3, 4, 5];

type Unite = { affectationId: number; classeId: number; matiereId: number; professeurId: number };

export function genererEmploiDuTemps(entree: EntreeGenerateur): ResultatGeneration {
  const jours = entree.jours ?? JOURS_DEFAUT;
  const periodesParId = new Map(entree.periodes.map((p) => [p.id, p]));
  const toutesCases: { jour: number; periodeId: number }[] = [];
  for (const jour of jours) {
    for (const p of entree.periodes) {
      toutesCases.push({ jour, periodeId: p.id });
    }
  }

  const indispo = new Set(entree.indisponibilites.map((i) => `${i.professeurId}-${i.jourSemaine}-${i.periodeGrilleId}`));

  // Etat mutable construit au fil des placements.
  const occupeClasse = new Set<string>(); // `${classeId}-${jour}-${periodeId}`
  const occupeProf = new Set<string>(); // `${professeurId}-${jour}-${periodeId}`
  const compteurMatiereJour = new Map<string, number>(); // `${classeId}-${matiereId}-${jour}`
  const compteurProfJour = new Map<string, number>(); // `${professeurId}-${jour}`
  const periodesProfJour = new Map<string, number[]>(); // `${professeurId}-${jour}` -> ordres deja places

  function incrementer(map: Map<string, number>, cle: string) {
    map.set(cle, (map.get(cle) ?? 0) + 1);
  }

  function nbIndisponibilites(professeurId: number): number {
    let n = 0;
    for (const j of jours) for (const p of entree.periodes) if (indispo.has(`${professeurId}-${j}-${p.id}`)) n++;
    return n;
  }

  // Les seances les plus difficiles a placer d'abord : professeur tres
  // indisponible, puis gros quota (plus de chances de saturer le planning).
  const affectationsTriees = [...entree.affectations].sort((a, b) => {
    const diffIndispo = nbIndisponibilites(b.professeurId) - nbIndisponibilites(a.professeurId);
    if (diffIndispo !== 0) return diffIndispo;
    return b.seancesParSemaine - a.seancesParSemaine;
  });

  const placements: PlacementGenere[] = [];
  const nonPlacees: SeanceNonPlacee[] = [];

  for (const affectation of affectationsTriees) {
    const periodesEvitees = entree.periodesEviteesParMatiere.get(affectation.matiereId) ?? new Set<number>();

    const peutPlacer = (jour: number, periodeId: number): boolean => {
      if (indispo.has(`${affectation.professeurId}-${jour}-${periodeId}`)) return false;
      if (occupeClasse.has(`${affectation.classeId}-${jour}-${periodeId}`)) return false;
      if (occupeProf.has(`${affectation.professeurId}-${jour}-${periodeId}`)) return false;
      const seancesMemeMatiereJour = compteurMatiereJour.get(`${affectation.classeId}-${affectation.matiereId}-${jour}`) ?? 0;
      if (seancesMemeMatiereJour >= entree.regles.maxSeancesMemeMatiereParJour) return false;
      const periodesDejaCeJour = compteurProfJour.get(`${affectation.professeurId}-${jour}`) ?? 0;
      if (periodesDejaCeJour >= entree.regles.maxPeriodesParJourProfesseur) return false;
      return true;
    };

    const scorer = (jour: number, periodeId: number): number => {
      const periode = periodesParId.get(periodeId)!;
      let score = 0;
      if (periodesEvitees.has(periodeId)) score -= 100;
      // Repartir sur plusieurs jours plutot que de grouper la meme matiere.
      const dejaCeJour = compteurMatiereJour.get(`${affectation.classeId}-${affectation.matiereId}-${jour}`) ?? 0;
      score -= dejaCeJour * 10;
      // Minimiser les trous du professeur ce jour-la.
      const ordresExistants = periodesProfJour.get(`${affectation.professeurId}-${jour}`) ?? [];
      if (ordresExistants.length > 0) {
        const tous = [...ordresExistants, periode.ordre];
        const etendue = Math.max(...tous) - Math.min(...tous) + 1;
        const trous = etendue - tous.length;
        score -= trous * 3;
      }
      score += Math.random() * 0.01; // depart d'egalite neutre
      return score;
    };

    for (let seance = 0; seance < affectation.seancesParSemaine; seance++) {
      const candidats = toutesCases
        .filter((c) => peutPlacer(c.jour, c.periodeId))
        .map((c) => ({ ...c, score: scorer(c.jour, c.periodeId) }))
        .sort((a, b) => b.score - a.score);

      if (candidats.length === 0) {
        nonPlacees.push({
          affectationId: affectation.id,
          classeId: affectation.classeId,
          matiereId: affectation.matiereId,
          professeurId: affectation.professeurId,
          motif: `Séance ${seance + 1}/${affectation.seancesParSemaine} : aucun créneau libre ne respecte les contraintes (indisponibilités, plafonds par jour, ou classe/professeur déjà occupés).`,
        });
        continue;
      }

      const choisi = candidats[0];
      const periode = periodesParId.get(choisi.periodeId)!;
      placements.push({
        affectationId: affectation.id,
        classeId: affectation.classeId,
        matiereId: affectation.matiereId,
        professeurId: affectation.professeurId,
        jourSemaine: choisi.jour,
        periodeGrilleId: choisi.periodeId,
        heureDebutMin: periode.heureDebutMin,
        heureFinMin: periode.heureFinMin,
      });

      occupeClasse.add(`${affectation.classeId}-${choisi.jour}-${choisi.periodeId}`);
      occupeProf.add(`${affectation.professeurId}-${choisi.jour}-${choisi.periodeId}`);
      incrementer(compteurMatiereJour, `${affectation.classeId}-${affectation.matiereId}-${choisi.jour}`);
      incrementer(compteurProfJour, `${affectation.professeurId}-${choisi.jour}`);
      const cleProfJour = `${affectation.professeurId}-${choisi.jour}`;
      const ordres = periodesProfJour.get(cleProfJour) ?? [];
      ordres.push(periode.ordre);
      periodesProfJour.set(cleProfJour, ordres);
    }
  }

  return { placements, nonPlacees };
}
