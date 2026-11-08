import { NextResponse } from "next/server";
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
    const resultatClasse = await trouverIdClasse(prisma, classeTexte);
    if (!resultatClasse.trouve) {
      erreurs.push(`Ligne ${r} : ${resultatClasse.motif}`);
      continue;
    }
    resolues.push({
      id: l.id,
      jourSemaine: l.jourSemaine,
      matiereId: l.matiereId,
      heureDebutMin,
      heureFinMin,
      classeId: resultatClasse.idClasse,
    });
  }

  // Chevauchements entre les lignes soumises elles-memes (meme jour, plages
  // qui se recouvrent) - l'envoi remplace tout l'emploi du temps actif du
  // professeur, donc seule la coherence interne de l'ensemble compte.
  for (let i = 0; i < resolues.length; i++) {
    for (let j = i + 1; j < resolues.length; j++) {
      const a = resolues[i];
      const b = resolues[j];
      if (a.jourSemaine === b.jourSemaine && a.heureDebutMin < b.heureFinMin && a.heureFinMin > b.heureDebutMin) {
        erreurs.push(`Les lignes ${i + 1} et ${j + 1} se chevauchent (même jour, horaires qui se recouvrent).`);
      }
    }
  }

  if (erreurs.length > 0) {
    return NextResponse.json({ erreur: "Erreurs de validation.", erreurs }, { status: 400 });
  }

  const idsConserves = resolues.filter((l) => l.id).map((l) => l.id as number);

  await prisma.$transaction(async (tx) => {
    await tx.emploiDuTemps.updateMany({
      where: { professeurId, actif: true, id: idsConserves.length > 0 ? { notIn: idsConserves } : undefined },
      data: { actif: false },
    });

    for (const l of resolues) {
      if (l.id) {
        await tx.emploiDuTemps.update({
          where: { id: l.id },
          data: {
            jourSemaine: l.jourSemaine,
            matiereId: l.matiereId,
            heureDebutMin: l.heureDebutMin,
            heureFinMin: l.heureFinMin,
            classeId: l.classeId,
            actif: true,
          },
        });
      } else {
        await tx.emploiDuTemps.create({
          data: {
            professeurId,
            jourSemaine: l.jourSemaine,
            matiereId: l.matiereId,
            heureDebutMin: l.heureDebutMin,
            heureFinMin: l.heureFinMin,
            classeId: l.classeId,
            dateDebutValidite: new Date(),
            dateImport: new Date(),
          },
        });
      }
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
