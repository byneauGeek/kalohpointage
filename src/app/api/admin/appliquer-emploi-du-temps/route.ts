import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

type PlacementEntree = {
  affectationId: number;
  classeId: number;
  matiereId: number;
  professeurId: number;
  jourSemaine: number;
  heureDebutMin: number;
  heureFinMin: number;
};

/** Ecrit le resultat du generateur automatique (voir
 * /api/admin/generer-emploi-du-temps) dans l'emploi du temps reel. Portee
 * du remplacement : uniquement les (classe, matiere) couvertes par les
 * affectations soumises - un (classe, matiere) sans affectation n'est
 * jamais touche, meme si cette classe a d'autres creneaux par ailleurs.
 * Pour chaque (classe, matiere) couverte : tous ses creneaux actifs sont
 * desactives (meme si 0 seance n'a pu etre replacee cette fois - mieux
 * vaut un trou visible qu'un ancien creneau perime laisse silencieusement
 * en place), puis les nouveaux creneaux sont crees. */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { placements, affectationIds } = (await request.json()) as {
    placements?: PlacementEntree[];
    affectationIds?: number[];
  };
  if (!Array.isArray(placements) || !Array.isArray(affectationIds) || affectationIds.length === 0) {
    return NextResponse.json({ erreur: "Résultat de génération manquant ou invalide." }, { status: 400 });
  }

  const affectations = await prisma.affectationEnseignement.findMany({ where: { id: { in: affectationIds } } });
  const affectationParId = new Map(affectations.map((a) => [a.id, a]));

  const pairesClasseMatiere = new Set<string>();
  for (const a of affectations) pairesClasseMatiere.add(`${a.classeId}-${a.matiereId}`);

  await prisma.$transaction(async (tx) => {
    for (const paire of pairesClasseMatiere) {
      const [classeId, matiereId] = paire.split("-").map(Number);
      await tx.emploiDuTemps.updateMany({ where: { classeId, matiereId, actif: true }, data: { actif: false } });
    }

    if (placements.length > 0) {
      await tx.emploiDuTemps.createMany({
        data: placements.map((p) => {
          const affectation = affectationParId.get(p.affectationId);
          return {
            professeurId: affectation?.professeurId ?? p.professeurId,
            classeId: p.classeId,
            matiereId: p.matiereId,
            jourSemaine: p.jourSemaine,
            heureDebutMin: p.heureDebutMin,
            heureFinMin: p.heureFinMin,
            dateDebutValidite: new Date(),
            dateImport: new Date(),
          };
        }),
      });
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "APPLICATION_GENERATEUR_EMPLOI_DU_TEMPS",
    tableConcernee: "emplois_du_temps",
    nouvelleValeur: `${placements.length} creneau(x) cree(s) sur ${pairesClasseMatiere.size} couple(s) classe/matiere, ${affectationIds.length} affectation(s) traitee(s)`,
  });

  return NextResponse.json({ ok: true, nbCreneaux: placements.length, nbCouples: pairesClasseMatiere.size });
}
