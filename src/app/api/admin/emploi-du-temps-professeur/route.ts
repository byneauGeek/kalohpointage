import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseHeureFrancaise } from "@/lib/heureUtils";
import { trouverIdClasse } from "@/lib/classeMatching";
import { enregistrerAudit } from "@/lib/audit";

type LigneEntree = { id?: number; jourSemaine: number; matiereId: number; heureDebut: string; heureFin: string; classe: string };

type LigneResolue = {
  id?: number;
  jourSemaine: number;
  matiereId: number;
  heureDebutMin: number;
  heureFinMin: number;
  classeId: number;
};

/** Remplace en un seul envoi tout l'emploi du temps actif d'un professeur
 * (voir EmploiDuTempsProfesseurForm.tsx) - jusqu'ici seule une modification
 * creneau par creneau etait possible (src/app/admin/emploi-du-temps/[id]).
 * Semantique "ensemble" : les lignes avec un id sont mises a jour, les
 * lignes sans id sont creees, et tout creneau actif du professeur absent
 * de l'envoi est desactive (meme logique que desactiverCreneau, juste
 * applique en masse). */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { professeurId, lignes } = (await request.json()) as { professeurId?: number; lignes?: LigneEntree[] };
  if (!professeurId) {
    return NextResponse.json({ erreur: "Professeur manquant." }, { status: 400 });
  }
  const professeur = await prisma.professeur.findUnique({ where: { id: professeurId } });
  if (!professeur) {
    return NextResponse.json({ erreur: "Professeur introuvable." }, { status: 404 });
  }
  if (!Array.isArray(lignes)) {
    return NextResponse.json({ erreur: "Lignes manquantes." }, { status: 400 });
  }

  // Resolution des classes en un seul aller-retour : le formulaire propose
  // les noms reels via une datalist, donc le cas courant (texte = nom exact
  // d'une classe existante) se resout entierement depuis cette liste, sans
  // requete supplementaire par ligne. Avant ce cache, chaque ligne appelait
  // trouverIdClasse() separement (1 requete/ligne), ce qui rendait
  // l'enregistrement d'un emploi du temps complet tres lent (autant de
  // aller-retours reseau que de creneaux, en serie).
  const toutesClasses = await prisma.classe.findMany({ select: { id: true, nomClasse: true } });
  const idClasseParNomExact = new Map(toutesClasses.map((c) => [c.nomClasse, c.id]));

  const erreurs: string[] = [];
  const resolues: LigneResolue[] = [];

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    const r = i + 1;
    if (!l.jourSemaine || l.jourSemaine < 1 || l.jourSemaine > 7) {
      erreurs.push(`Ligne ${r} : jour invalide.`);
      continue;
    }
    if (!l.matiereId) {
      erreurs.push(`Ligne ${r} : matière obligatoire.`);
      continue;
    }
    const heureDebutMin = parseHeureFrancaise(l.heureDebut ?? "");
    const heureFinMin = parseHeureFrancaise(l.heureFin ?? "");
    if (heureDebutMin === null || heureFinMin === null) {
      erreurs.push(`Ligne ${r} : heure de début ou de fin invalide.`);
      continue;
    }
    if (heureFinMin <= heureDebutMin) {
      erreurs.push(`Ligne ${r} : l'heure de fin doit être postérieure à l'heure de début.`);
      continue;
    }
    const classeTexte = (l.classe ?? "").trim();
    if (!classeTexte) {
      erreurs.push(`Ligne ${r} : classe obligatoire.`);
      continue;
    }
    let idClasse = idClasseParNomExact.get(classeTexte);
    if (idClasse === undefined) {
      const resultatClasse = await trouverIdClasse(prisma, classeTexte);
      if (!resultatClasse.trouve) {
        erreurs.push(`Ligne ${r} : ${resultatClasse.motif}`);
        continue;
      }
      idClasse = resultatClasse.idClasse;
    }
    resolues.push({
      id: l.id,
      jourSemaine: l.jourSemaine,
      matiereId: l.matiereId,
      heureDebutMin,
      heureFinMin,
      classeId: idClasse,
    });
  }

  // Chevauchements entre les lignes soumises elles-memes (meme jour, plages
  // qui se recouvrent) - l'envoi remplace tout l'emploi du temps actif du
  // professeur, donc seule la coherence interne de l'ensemble compte. Un
  // professeur peut avoir plusieurs classes en simultane sur le meme
  // creneau (ex. 3e1/3e2/3e3 en meme temps) : seul un chevauchement sur LA
  // MEME classe est une vraie erreur (double saisie du meme creneau).
  for (let i = 0; i < resolues.length; i++) {
    for (let j = i + 1; j < resolues.length; j++) {
      const a = resolues[i];
      const b = resolues[j];
      if (
        a.jourSemaine === b.jourSemaine &&
        a.classeId === b.classeId &&
        a.heureDebutMin < b.heureFinMin &&
        a.heureFinMin > b.heureDebutMin
      ) {
        erreurs.push(`Les lignes ${i + 1} et ${j + 1} se chevauchent sur la même classe (même jour, horaires qui se recouvrent).`);
      }
    }
  }

  if (erreurs.length > 0) {
    return NextResponse.json({ erreur: "Erreurs de validation.", erreurs }, { status: 400 });
  }

  const idsConserves = resolues.filter((l) => l.id).map((l) => l.id as number);
  const aCreer = resolues.filter((l) => !l.id);
  const aMettreAJour = resolues.filter((l) => l.id);

  // Un aller-retour par ligne (update puis create, en serie) rendait
  // l'enregistrement tres lent dès qu'un professeur avait plus de quelques
  // creneaux. Desormais : au plus 3 aller-retours au total, quel que soit le
  // nombre de creneaux - createMany pour les nouvelles lignes, et un UPDATE
  // groupe (FROM VALUES) pour les lignes existantes, chacune avec ses
  // propres valeurs en un seul passage.
  await prisma.$transaction(async (tx) => {
    await tx.emploiDuTemps.updateMany({
      where: { professeurId, actif: true, id: idsConserves.length > 0 ? { notIn: idsConserves } : undefined },
      data: { actif: false },
    });

    if (aCreer.length > 0) {
      await tx.emploiDuTemps.createMany({
        data: aCreer.map((l) => ({
          professeurId,
          jourSemaine: l.jourSemaine,
          matiereId: l.matiereId,
          heureDebutMin: l.heureDebutMin,
          heureFinMin: l.heureFinMin,
          classeId: l.classeId,
          dateDebutValidite: new Date(),
          dateImport: new Date(),
        })),
      });
    }

    if (aMettreAJour.length > 0) {
      await tx.$executeRaw`
        UPDATE emplois_du_temps AS e
        SET "jourSemaine" = v."jourSemaine",
            "matiereId" = v."matiereId",
            "heureDebutMin" = v."heureDebutMin",
            "heureFinMin" = v."heureFinMin",
            "classeId" = v."classeId",
            actif = true
        FROM (VALUES ${Prisma.join(
          aMettreAJour.map(
            (l) =>
              Prisma.sql`(${l.id}::int, ${l.jourSemaine}::int, ${l.matiereId}::int, ${l.heureDebutMin}::int, ${l.heureFinMin}::int, ${l.classeId}::int)`
          )
        )}) AS v(id, "jourSemaine", "matiereId", "heureDebutMin", "heureFinMin", "classeId")
        WHERE e.id = v.id
      `;
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_EMPLOI_DU_TEMPS_GLOBALE",
    tableConcernee: "emplois_du_temps",
    idEnregistrement: professeurId,
    nouvelleValeur: `${resolues.length} créneau(x) actif(s) après modification`,
  });

  return NextResponse.json({ ok: true, nbCreneaux: resolues.length });
}
