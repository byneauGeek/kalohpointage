import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { genererEmploiDuTemps } from "@/lib/generateurEmploiDuTemps";
import { CLE_MAX_SEANCES_JOUR, CLE_MAX_PERIODES_JOUR_PROF } from "@/lib/parametresGenerateur";

/** Lance le generateur automatique et renvoie le resultat SANS rien ecrire
 * en base (previsualisation) - voir /api/admin/appliquer-emploi-du-temps
 * pour l'ecriture effective, une fois l'admin satisfait du resultat. */
export async function POST() {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const [periodes, affectations, indisponibilites, periodesEvitees, paramMaxSeances, paramMaxPeriodes, classes, matieres, professeurs] =
    await Promise.all([
      prisma.periodeGrille.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
      prisma.affectationEnseignement.findMany({ where: { actif: true } }),
      prisma.indisponibiliteProfesseur.findMany(),
      prisma.matierePeriodeEvitee.findMany(),
      prisma.parametre.findUnique({ where: { cle: CLE_MAX_SEANCES_JOUR } }),
      prisma.parametre.findUnique({ where: { cle: CLE_MAX_PERIODES_JOUR_PROF } }),
      prisma.classe.findMany({ where: { actif: true } }),
      prisma.matiere.findMany({ where: { actif: true } }),
      prisma.professeur.findMany({ where: { actif: true } }),
    ]);

  if (periodes.length === 0) {
    return NextResponse.json({ erreur: "Aucune période définie. Configurez d'abord la grille horaire." }, { status: 400 });
  }
  if (affectations.length === 0) {
    return NextResponse.json({ erreur: "Aucune affectation définie. Configurez d'abord qui enseigne quoi à qui." }, { status: 400 });
  }

  const periodesEviteesParMatiere = new Map<number, Set<number>>();
  for (const pe of periodesEvitees) {
    if (!periodesEviteesParMatiere.has(pe.matiereId)) periodesEviteesParMatiere.set(pe.matiereId, new Set());
    periodesEviteesParMatiere.get(pe.matiereId)!.add(pe.periodeGrilleId);
  }

  const resultat = genererEmploiDuTemps({
    periodes: periodes.map((p) => ({ id: p.id, ordre: p.ordre, heureDebutMin: p.heureDebutMin, heureFinMin: p.heureFinMin })),
    affectations: affectations.map((a) => ({
      id: a.id,
      classeId: a.classeId,
      matiereId: a.matiereId,
      professeurId: a.professeurId,
      seancesParSemaine: a.seancesParSemaine,
    })),
    indisponibilites: indisponibilites.map((i) => ({
      professeurId: i.professeurId,
      jourSemaine: i.jourSemaine,
      periodeGrilleId: i.periodeGrilleId,
    })),
    periodesEviteesParMatiere,
    regles: {
      maxSeancesMemeMatiereParJour: Number(paramMaxSeances?.valeur ?? 2),
      maxPeriodesParJourProfesseur: Number(paramMaxPeriodes?.valeur ?? 6),
    },
  });

  const classeParId = new Map(classes.map((c) => [c.id, c.nomClasse]));
  const matiereParId = new Map(matieres.map((m) => [m.id, m.libelle]));
  const professeurParId = new Map(professeurs.map((p) => [p.id, `${p.nom} ${p.prenom}`]));
  const periodeParId = new Map(periodes.map((p) => [p.id, p.libelle]));

  return NextResponse.json({
    affectationIds: affectations.map((a) => a.id),
    placements: resultat.placements.map((p) => ({
      ...p,
      classeNom: classeParId.get(p.classeId) ?? "?",
      matiereLibelle: matiereParId.get(p.matiereId) ?? "?",
      professeurNom: professeurParId.get(p.professeurId) ?? "?",
      periodeLibelle: periodeParId.get(p.periodeGrilleId) ?? "?",
    })),
    nonPlacees: resultat.nonPlacees.map((n) => ({
      ...n,
      classeNom: classeParId.get(n.classeId) ?? "?",
      matiereLibelle: matiereParId.get(n.matiereId) ?? "?",
      professeurNom: professeurParId.get(n.professeurId) ?? "?",
    })),
  });
}
