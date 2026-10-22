/**
 * Portage de mdl_Import.bas : import d'un emploi du temps professeur depuis
 * un fichier Excel. Colonnes lues PAR NOM D'EN-TETE (Jour, Heure début,
 * Heure fin, Type, Classe), pas par position fixe : les fichiers reels du
 * college n'ont pas tous le meme nombre de lignes/colonnes vides avant le
 * tableau, et certains (ceux generes avec un Tableau Excel nomme, feuille
 * "Données pour Access") demarrent directement en colonne A quand d'autres
 * laissent la colonne A vide. On localise donc la ligne d'en-tete puis on
 * lit chaque colonne par le libelle trouve dans cette ligne. Seules les
 * lignes Type="Cours" sont importees. Une ligne peut decrire un creneau
 * partage entre plusieurs classes (D82) : eclatee en plusieurs creneaux,
 * jamais une classe fictive.
 */
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { parseHeureFrancaise, jourSemaineVersNumero } from "@/lib/heureUtils";
import { eclaterClassesCombinees, trouverIdClasse } from "@/lib/classeMatching";
import { stockerFichierImport } from "@/lib/storage";

export type ResultatImport = {
  lignesLues: number;
  lignesImportees: number;
  lignesRejetees: number;
  erreurs: string[];
  avertissements: string[];
  importLogId: number;
};

function normaliser(texte: unknown): string {
  return String(texte ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const ALIAS_COLONNES: Record<string, string> = {
  jour: "jour",
  "heure debut": "heureDebut",
  "heure fin": "heureFin",
  type: "type",
  classe: "classe",
};

type IndexColonnes = { jour: number; heureDebut: number; heureFin: number; type: number; classe: number };

/** Cherche, dans les premieres lignes d'une feuille, la ligne d'en-tete
 * contenant au moins Jour/Heure debut/Heure fin/Type/Classe (quel que soit
 * l'ordre ou le nombre de colonnes vides avant), et retourne l'index (0-based)
 * de chaque colonne utile. null si la feuille ne contient pas ces en-tetes. */
function localiserEntetes(lignes: unknown[][]): { ligneEntete: number; index: IndexColonnes } | null {
  const limite = Math.min(lignes.length, 30);
  for (let r = 0; r < limite; r++) {
    const ligne = lignes[r] ?? [];
    const trouve: Partial<Record<string, number>> = {};
    ligne.forEach((cellule, c) => {
      const cle = ALIAS_COLONNES[normaliser(cellule)];
      if (cle) trouve[cle] = c;
    });
    if (trouve.jour !== undefined && trouve.heureDebut !== undefined && trouve.heureFin !== undefined && trouve.type !== undefined && trouve.classe !== undefined) {
      return {
        ligneEntete: r,
        index: trouve as IndexColonnes,
      };
    }
  }
  return null;
}

/** Choisit la feuille a importer : priorite a une feuille nommee "Données
 * pour Access" (format d'export dedie a l'import, present sur les fichiers
 * officiels du college), sinon la premiere feuille dont l'en-tete est
 * reconnu. Leve une erreur explicite si aucune feuille ne convient. */
function extraireLignesAImporter(classeur: XLSX.WorkBook): { lignesDonnees: unknown[][]; index: IndexColonnes } {
  const nomsParPriorite = [...classeur.SheetNames].sort((a, b) => {
    const aDediee = normaliser(a).includes("donnees pour access") ? 0 : 1;
    const bDediee = normaliser(b).includes("donnees pour access") ? 0 : 1;
    return aDediee - bDediee;
  });

  for (const nom of nomsParPriorite) {
    const feuille = classeur.Sheets[nom];
    const lignes = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, raw: false, defval: null });
    const entetes = localiserEntetes(lignes);
    if (entetes) {
      return { lignesDonnees: lignes.slice(entetes.ligneEntete + 1), index: entetes.index };
    }
  }

  throw new Error(
    "En-tête introuvable dans le fichier : aucune feuille ne contient les colonnes attendues (Jour, Heure début, Heure fin, Type, Classe)."
  );
}

export async function importerEmploiDuTemps(params: {
  buffer: Buffer;
  professeurId: number;
  matiereId: number;
  dateDebutValidite: Date;
  dateFinValidite: Date | null;
  nomFichier: string;
  importeParId: number;
}): Promise<ResultatImport> {
  const classesAbsentes = new Set<string>();
  const erreurs: string[] = [];
  let lignesLues = 0;
  let lignesImportees = 0;
  let lignesRejetees = 0;

  const importLog = await prisma.importLog.create({
    data: { importeParId: params.importeParId, nomFichier: params.nomFichier },
  });

  let lignesDonnees: unknown[][] = [];
  let index: IndexColonnes | null = null;
  try {
    const classeur = XLSX.read(params.buffer, { type: "buffer" });
    ({ lignesDonnees, index } = extraireLignesAImporter(classeur));
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Fichier illisible (format Excel invalide).";
    await prisma.importLog.update({ where: { id: importLog.id }, data: { detailErreurs: message } });
    return { lignesLues: 0, lignesImportees: 0, lignesRejetees: 0, erreurs: [message], avertissements: [], importLogId: importLog.id };
  }

  for (let i = 0; i < lignesDonnees.length; i++) {
    const r = i + 1; // numero de ligne cote utilisateur, relatif au debut des donnees
    const ligne = lignesDonnees[i] ?? [];
    const jourTexte = String(ligne[index.jour] ?? "").trim();
    const typeTexte = String(ligne[index.type] ?? "").trim();
    const classeTexte = String(ligne[index.classe] ?? "").trim();
    const heureDebutTexte = String(ligne[index.heureDebut] ?? "").trim();
    const heureFinTexte = String(ligne[index.heureFin] ?? "").trim();

    if (jourTexte === "" && classeTexte === "" && heureDebutTexte === "" && heureFinTexte === "") {
      continue; // ligne entierement vide, ignoree sans compter
    }
    lignesLues++;

    if (jourTexte === "" || classeTexte === "" || heureDebutTexte === "" || heureFinTexte === "") {
      erreurs.push(`Ligne ${r} : colonne(s) obligatoire(s) manquante(s) (Jour/Heure debut/Heure fin/Classe)`);
      lignesRejetees++;
      continue;
    }
    if (typeTexte.toUpperCase() !== "COURS") {
      erreurs.push(`Ligne ${r} : type de creneau non pris en charge ('${typeTexte}'), ligne ignoree`);
      lignesRejetees++;
      continue;
    }
    const numJour = jourSemaineVersNumero(jourTexte);
    if (numJour === 0) {
      erreurs.push(`Ligne ${r} : jour de semaine invalide ('${jourTexte}', attendu Lundi..Dimanche)`);
      lignesRejetees++;
      continue;
    }
    const heureDebutMin = parseHeureFrancaise(heureDebutTexte);
    const heureFinMin = parseHeureFrancaise(heureFinTexte);
    if (heureDebutMin === null || heureFinMin === null) {
      erreurs.push(`Ligne ${r} : heure de debut ou de fin invalide ('${heureDebutTexte}' / '${heureFinTexte}')`);
      lignesRejetees++;
      continue;
    }
    if (heureFinMin <= heureDebutMin) {
      erreurs.push(`Ligne ${r} : l'heure de fin (${heureFinTexte}) doit etre posterieure a l'heure de debut (${heureDebutTexte})`);
      lignesRejetees++;
      continue;
    }

    const classes = await eclaterClassesCombinees(prisma, classeTexte);
    const idsLigne: number[] = [];
    let auMoinsUneReussie = false;

    for (const classeUnitaire of classes) {
      if (classeUnitaire.trim() === "") continue;
      const resultat = await trouverIdClasse(prisma, classeUnitaire);
      if (!resultat.trouve) {
        erreurs.push(`Ligne ${r} : ${resultat.motif}`);
        if (resultat.absente) classesAbsentes.add(classeUnitaire);
        continue;
      }

      const chevauchement = await prisma.emploiDuTemps.findFirst({
        where: {
          professeurId: params.professeurId,
          jourSemaine: numJour,
          actif: true,
          heureDebutMin: { lt: heureFinMin },
          heureFinMin: { gt: heureDebutMin },
          id: idsLigne.length > 0 ? { notIn: idsLigne } : undefined,
          OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: params.dateDebutValidite } }],
          dateDebutValidite: params.dateFinValidite ? { lte: params.dateFinValidite } : undefined,
        },
      });
      if (chevauchement) {
        erreurs.push(
          `Ligne ${r} : chevauchement avec un creneau existant pour ce professeur (${jourTexte} ${heureDebutTexte}-${heureFinTexte} / ${classeUnitaire})`
        );
        continue;
      }

      const cree = await prisma.emploiDuTemps.create({
        data: {
          professeurId: params.professeurId,
          classeId: resultat.idClasse,
          matiereId: params.matiereId,
          jourSemaine: numJour,
          heureDebutMin,
          heureFinMin,
          dateDebutValidite: params.dateDebutValidite,
          dateFinValidite: params.dateFinValidite,
          dateImport: new Date(),
          importLogId: importLog.id,
        },
      });
      idsLigne.push(cree.id);
      auMoinsUneReussie = true;
    }

    if (auMoinsUneReussie) lignesImportees++;
    else lignesRejetees++;
  }

  const avertissements: string[] = [];
  if (classesAbsentes.size > 0) {
    avertissements.push(
      `Classes du fichier ABSENTES de la base (a creer ou a corriger, puis relancer l'import) : ${Array.from(classesAbsentes).join(", ")}`
    );
  }

  // Conserve le fichier Excel original pour tracabilite - n'echoue jamais
  // l'import si le stockage objet est indisponible/non configure.
  const cleStockageFichier = await stockerFichierImport(params.buffer, importLog.id, params.nomFichier);

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      lignesLues,
      lignesImportees,
      lignesRejetees,
      detailErreurs: erreurs.join("\n"),
      detailAvertissements: avertissements.join("\n"),
      cleStockageFichier,
    },
  });

  return { lignesLues, lignesImportees, lignesRejetees, erreurs, avertissements, importLogId: importLog.id };
}
