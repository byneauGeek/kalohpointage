import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

type LigneEntree = { id?: number; matiereId: number; professeurId: number; seancesParSemaine: number };

/** Remplace en un seul envoi toutes les affectations actives d'une classe
 * (voir AffectationsForm.tsx) - meme semantique "ensemble remplace" que les
 * autres editeurs en masse. Une seule affectation active par matiere pour
 * une classe (contrainte @@unique([classeId, matiereId]) sur le modele). */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { classeId, lignes } = (await request.json()) as { classeId?: number; lignes?: LigneEntree[] };
  if (!classeId) {
    return NextResponse.json({ erreur: "Classe manquante." }, { status: 400 });
  }
  const classe = await prisma.classe.findUnique({ where: { id: classeId } });
  if (!classe) {
    return NextResponse.json({ erreur: "Classe introuvable." }, { status: 404 });
  }
  if (!Array.isArray(lignes)) {
    return NextResponse.json({ erreur: "Lignes manquantes." }, { status: 400 });
  }

  const erreurs: string[] = [];
  const matieresVues = new Set<number>();

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    const r = i + 1;
    if (!l.matiereId) {
      erreurs.push(`Ligne ${r} : matière obligatoire.`);
      continue;
    }
    if (!l.professeurId) {
      erreurs.push(`Ligne ${r} : professeur obligatoire.`);
      continue;
    }
    if (!l.seancesParSemaine || l.seancesParSemaine < 1 || l.seancesParSemaine > 30) {
      erreurs.push(`Ligne ${r} : nombre de séances par semaine invalide.`);
      continue;
    }
    if (matieresVues.has(l.matiereId)) {
      erreurs.push(`Ligne ${r} : cette matière est déjà affectée ailleurs dans cet envoi (une seule ligne par matière).`);
      continue;
    }
    matieresVues.add(l.matiereId);
  }

  if (erreurs.length > 0) {
    return NextResponse.json({ erreur: "Erreurs de validation.", erreurs }, { status: 400 });
  }

  const idsConserves = lignes.filter((l) => l.id).map((l) => l.id as number);
  const aCreer = lignes.filter((l) => !l.id);
  const aMettreAJour = lignes.filter((l) => l.id);

  await prisma.$transaction(async (tx) => {
    await tx.affectationEnseignement.updateMany({
      where: { classeId, actif: true, id: idsConserves.length > 0 ? { notIn: idsConserves } : undefined },
      data: { actif: false },
    });

    for (const l of aMettreAJour) {
      await tx.affectationEnseignement.update({
        where: { id: l.id },
        data: { matiereId: l.matiereId, professeurId: l.professeurId, seancesParSemaine: l.seancesParSemaine, actif: true },
      });
    }

    if (aCreer.length > 0) {
      await tx.affectationEnseignement.createMany({
        data: aCreer.map((l) => ({
          classeId,
          matiereId: l.matiereId,
          professeurId: l.professeurId,
          seancesParSemaine: l.seancesParSemaine,
        })),
      });
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_AFFECTATIONS",
    tableConcernee: "affectations_enseignement",
    idEnregistrement: classeId,
    nouvelleValeur: `${lignes.length} affectation(s) active(s) apres modification`,
  });

  return NextResponse.json({ ok: true, nbAffectations: lignes.length });
}
