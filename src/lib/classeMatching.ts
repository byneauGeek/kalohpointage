/**
 * Portage fidele de mdl_Import.bas (LOT 17b/17e, voir Journal_Decisions.md D77/D82) :
 * rapprochement des noms de classe a l'import, et eclatement des creneaux
 * partages entre plusieurs classes ("2ndeA/C", "2ndeA-C", "2ndeA et C"...).
 */

import type { PrismaClient } from "@prisma/client";

/** Forme comparable d'un nom de classe : casse, accents, separateurs et
 * ecritures de l'ordinal francais ignores (6e2 = 6è2 = 6ème2 = 6eme2 = 6°2). */
export function normaliserNomClasse(texte: string): string {
  let r = texte.toLowerCase();
  // accents -> forme sans accent
  r = r
    .replace(/[àáâä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/°/g, "e"); // signe degre -> "e" (ordinal : 6°2 -> 6e2)
  // separateurs ignores : espace (incl. insecable), tiret, point, souligne, apostrophes
  r = r.replace(/[\s \-_.'’]/g, "");
  // "ème"/"eme" (ordinal en toutes lettres) -> "e" seul, pour rejoindre 6e2
  r = r.replace(/eme/g, "e");
  return r;
}

/** Decoupe "2ndeA1" en base="2nde" / serie="A1" (dernier bloc = une lettre puis
 * des chiffres facultatifs). Retourne null si le texte n'a pas cette forme
 * (ex. "C" seul : rien avant la lettre -> pas de base propre). */
export function extraireBaseEtSerie(texte: string): { base: string; serie: string } | null {
  let i = texte.length;
  while (i >= 1 && texte[i - 1] >= "0" && texte[i - 1] <= "9") i--;
  if (i < 1) return null; // texte entierement numerique
  const car = texte[i - 1];
  const estLettre = (car >= "A" && car <= "Z") || (car >= "a" && car <= "z");
  if (!estLettre) return null;
  const base = texte.slice(0, i - 1);
  const serie = texte.slice(i - 1);
  if (base.length === 0) return null;
  return { base, serie };
}

/** Verifie si texteClasse correspond deja a une classe existante (nom exact ou
 * rapprochement normalise non ambigu), SANS journaliser quoi que ce soit -
 * verification silencieuse utilisee uniquement pour decider si un texte est
 * une notation combinee ou un nom de classe a part entiere. */
export async function classeExisteDeja(prisma: PrismaClient, texteClasse: string): Promise<boolean> {
  const exact = await prisma.classe.findUnique({ where: { nomClasse: texteClasse } });
  if (exact) return true;

  const cible = normaliserNomClasse(texteClasse);
  if (cible === "") return false;
  const toutes = await prisma.classe.findMany({ select: { nomClasse: true } });
  const trouvees = toutes.filter((c) => normaliserNomClasse(c.nomClasse) === cible);
  return trouvees.length === 1;
}

/**
 * Eclate une ligne d'emploi du temps qui decrit un creneau COMMUN a plusieurs
 * classes ("2ndeA et C", "2ndeA/C", "2ndeA-C", "4e1 et 4e2") en PLUSIEURS
 * classes - jamais une classe fictive appelee "2ndeA/C". Le texte apres le
 * premier separateur, s'il est trop court pour se suffire a lui-meme (ex "C",
 * "D2"), herite du niveau+serie du premier morceau ("2nde" dans "2ndeA/C" ->
 * "C" devient "2ndeC"). Retourne un tableau d'au moins un element (le texte
 * d'origine si aucun separateur n'est trouve, ou s'il correspond deja a une
 * classe reelle existante).
 */
export async function eclaterClassesCombinees(prisma: PrismaClient, texteClasse: string): Promise<string[]> {
  // Protection : un nom de classe reel peut contenir par coincidence un tiret
  // ou une virgule (ex. "ZZ-Classe-Import") - ne jamais l'eclater dans ce cas.
  if (await classeExisteDeja(prisma, texteClasse)) {
    return [texteClasse.trim()];
  }

  const seps = [" et ", "/", "-", "&", ","];
  let sepTrouve: string | null = null;
  for (const sep of seps) {
    if (texteClasse.toLowerCase().includes(sep.toLowerCase())) {
      sepTrouve = sep;
      break;
    }
  }
  if (!sepTrouve) return [texteClasse.trim()];

  const morceaux = texteClasse.split(new RegExp(sepTrouve.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).map((m) => m.trim());

  const premier = extraireBaseEtSerie(morceaux[0]);
  if (premier) {
    for (let i = 1; i < morceaux.length; i++) {
      if (morceaux[i] !== "" && morceaux[i].length <= 2 && !extraireBaseEtSerie(morceaux[i])) {
        morceaux[i] = premier.base + morceaux[i];
      }
    }
  }
  return morceaux;
}

export type ResultatRecherche =
  | { trouve: true; idClasse: number }
  | { trouve: false; motif: string; absente: boolean };

/** Nom exact d'abord ; sinon rapprochement par forme normalisee SI une seule
 * classe correspond (jamais de choix arbitraire en cas d'ambiguite). */
export async function trouverIdClasse(prisma: PrismaClient, nomFichier: string): Promise<ResultatRecherche> {
  const exact = await prisma.classe.findUnique({ where: { nomClasse: nomFichier } });
  if (exact) return { trouve: true, idClasse: exact.id };

  const cible = normaliserNomClasse(nomFichier);
  if (cible === "") return { trouve: false, motif: `classe inconnue ('${nomFichier}')`, absente: true };

  const toutes = await prisma.classe.findMany({ select: { id: true, nomClasse: true } });
  const trouvees = toutes.filter((c) => normaliserNomClasse(c.nomClasse) === cible);

  if (trouvees.length === 1) return { trouve: true, idClasse: trouvees[0].id };
  if (trouvees.length === 0) return { trouve: false, motif: `classe inconnue ('${nomFichier}')`, absente: true };
  return {
    trouve: false,
    motif: `classe ambigue ('${nomFichier}' correspond a plusieurs classes de la base)`,
    absente: false,
  };
}
