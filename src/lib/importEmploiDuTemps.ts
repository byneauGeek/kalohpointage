/**
 * Portage de mdl_Import.bas : import d'un emploi du temps professeur depuis
 * un fichier Excel. Colonnes lues PAR POSITION (A..F), pas par nom d'en-tete
 * - voir Journal_Decisions.md D62 : seul l'ordre compte, Jour | Creneau |
 * Heure debut | Heure fin | Type | Classe. Seules les lignes Type="Cours"
 * sont importees. Une ligne peut decrire un creneau partage entre plusieurs
 * classes (D82) : eclatee en plusieurs creneaux, jamais une classe fictive.
 */
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { parseHeureFrancaise, jourSemaineVersNumero } from "@/lib/heureUtils";
import { eclaterClassesCombinees, trouverIdClasse } from "@/lib/classeMatching";

export type ResultatImport = {
  lignesLues: number;
  lignesImportees: number;
  lignesRejetees: number;
  erreurs: string[];
  avertissements: string[];
  importLogId: number;
};

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

  const classeur = new ExcelJS.Workbook();
  // Cast : exceljs type son parametre sur une version anterieure de Buffer
  // (sans les champs resizable/detached ajoutes recemment a @types/node).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await classeur.xlsx.load(params.buffer as any);
  const feuille = classeur.worksheets[0];

  for (let r = 2; r <= feuille.rowCount; r++) {
    // ligne 1 = en-tete, ignoree quel que soit son libelle exact
    const ligne = feuille.getRow(r);
    const jourTexte = String(ligne.getCell(1).value ?? "").trim();
    const typeTexte = String(ligne.getCell(5).value ?? "").trim();
    const classeTexte = String(ligne.getCell(6).value ?? "").trim();
    const heureDebutTexte = String(ligne.getCell(3).value ?? "").trim();
    const heureFinTexte = String(ligne.getCell(4).value ?? "").trim();

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

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      lignesLues,
      lignesImportees,
      lignesRejetees,
      detailErreurs: erreurs.join("\n"),
      detailAvertissements: avertissements.join("\n"),
    },
  });

  return { lignesLues, lignesImportees, lignesRejetees, erreurs, avertissements, importLogId: importLog.id };
}
