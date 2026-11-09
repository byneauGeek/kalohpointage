import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

/** Remplace en un seul envoi les periodes a eviter d'UNE matiere (contrainte
 * souple du generateur automatique) - suppression + recreation simple,
 * meme logique que les indisponibilites de professeur. */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { matiereId, periodeGrilleIds } = (await request.json()) as { matiereId?: number; periodeGrilleIds?: number[] };
  if (!matiereId) {
    return NextResponse.json({ erreur: "Matière manquante." }, { status: 400 });
  }
  const matiere = await prisma.matiere.findUnique({ where: { id: matiereId } });
  if (!matiere) {
    return NextResponse.json({ erreur: "Matière introuvable." }, { status: 404 });
  }
  if (!Array.isArray(periodeGrilleIds)) {
    return NextResponse.json({ erreur: "Périodes manquantes." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.matierePeriodeEvitee.deleteMany({ where: { matiereId } });
    if (periodeGrilleIds.length > 0) {
      await tx.matierePeriodeEvitee.createMany({
        data: periodeGrilleIds.map((periodeGrilleId) => ({ matiereId, periodeGrilleId })),
      });
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_PERIODES_EVITEES",
    tableConcernee: "matieres_periodes_evitees",
    idEnregistrement: matiereId,
    nouvelleValeur: `${periodeGrilleIds.length} periode(s) a eviter`,
  });

  return NextResponse.json({ ok: true, nbPeriodes: periodeGrilleIds.length });
}
