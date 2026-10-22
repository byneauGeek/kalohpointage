/** Portage de mdl_Utils.ConvertirHeureFrancaise : accepte "7h30", "14h5",
 * "9h" (sans minutes) ou "14:30" ; renvoie des minutes depuis minuit, ou null
 * si invalide (plage d'heures/minutes hors limites comprise). */
export function parseHeureFrancaise(texte: string): number | null {
  const t = texte.trim();
  let m = /^(\d{1,2})h(\d{1,2})?$/i.exec(t);
  if (!m) m = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  if (!m) return null;
  const heures = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  if (heures < 0 || heures > 23 || minutes < 0 || minutes > 59) return null;
  return heures * 60 + minutes;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export function jourSemaineVersNumero(texte: string): number {
  const idx = JOURS.indexOf(texte.trim().toLowerCase());
  return idx === -1 ? 0 : idx + 1;
}
