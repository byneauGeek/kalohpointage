/**
 * Mois calendaire "YYYY-MM" utilise par le rapport mensuel et la fiche
 * d'emargement (dashboard) : ces documents raisonnent en mois civil, pas en
 * Periode (annee scolaire), d'ou ce petit utilitaire partage plutot que de
 * dupliquer le parsing dans chaque route API.
 */
export type MoisCalendaire = {
  dateDebut: Date;
  dateFin: Date;
  moisLibelle: string;
  valeur: string;
};

export function resoudreMoisCalendaire(param?: string | null): MoisCalendaire {
  const maintenant = new Date();
  let annee = maintenant.getUTCFullYear();
  let mois = maintenant.getUTCMonth(); // 0-indexe

  const m = param ? /^(\d{4})-(\d{2})$/.exec(param) : null;
  if (m) {
    annee = Number(m[1]);
    mois = Number(m[2]) - 1;
  }

  const dateDebut = new Date(Date.UTC(annee, mois, 1));
  const dateFin = new Date(Date.UTC(annee, mois + 1, 0, 23, 59, 59, 999));
  const libelleBrut = dateDebut.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const moisLibelle = libelleBrut.charAt(0).toUpperCase() + libelleBrut.slice(1);
  const valeur = `${annee}-${String(mois + 1).padStart(2, "0")}`;

  return { dateDebut, dateFin, moisLibelle, valeur };
}

/** Options pour un <select> "mois" - le mois en cours puis les nbMoisPrecedents precedents, du plus recent au plus ancien. */
export function optionsMoisCalendaire(nbMoisPrecedents = 12): { valeur: string; libelle: string }[] {
  const maintenant = new Date();
  const options = [];
  for (let i = 0; i <= nbMoisPrecedents; i++) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
    const { valeur, moisLibelle } = resoudreMoisCalendaire(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    options.push({ valeur, libelle: moisLibelle });
  }
  return options;
}
