import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

type Creneau = { jourSemaine: number; periodeGrilleId: number };

/** Remplace en un seul envoi toutes les indisponibilites d'un professeur.
 * Suppression + recreation simple (pas de semantique "desactiver" ici) :
 * contrairement a EmploiDuTemps/Cours, ce n'est qu'un etat de configuration
 * courant sans valeur d'audit a conserver creneau par creneau. */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { professeurId, creneaux } = (await request.json()) as { professeurId?: number; creneaux?: Creneau[] };
  if (!professeurId) {
    return NextResponse.json({ erreur: "Professeur manquant." }, { status: 400 });
  }
  const professeur = await prisma.professeur.findUnique({ where: { id: professeurId } });
  if (!professeur) {
    return NextResponse.json({ erreur: "Professeur introuvable." }, { status: 404 });
  }
  if (!Array.isArray(creneaux)) {
    return NextResponse.json({ erreur: "Créneaux manquants." }, { status: 400 });
  }
  for (const c of creneaux) {
    if (!c.jourSemaine || c.jourSemaine < 1 || c.jourSemaine > 7 || !c.periodeGrilleId) {
      return NextResponse.json({ erreur: "Créneau invalide." }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.indisponibiliteProfesseur.deleteMany({ where: { professeurId } });
    if (creneaux.length > 0) {
      await tx.indisponibiliteProfesseur.createMany({
        data: creneaux.map((c) => ({ professeurId, jourSemaine: c.jourSemaine, periodeGrilleId: c.periodeGrilleId })),
      });
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_INDISPONIBILITES",
    tableConcernee: "indisponibilites_professeur",
    idEnregistrement: professeurId,
    nouvelleValeur: `${creneaux.length} creneau(x) indisponible(s)`,
  });

  return NextResponse.json({ ok: true, nbCreneaux: creneaux.length });
}
