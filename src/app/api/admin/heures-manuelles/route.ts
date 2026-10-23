import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseHeureFrancaise } from "@/lib/heureUtils";
import { enregistrerAudit } from "@/lib/audit";

type LigneEntree = { date: string; heureArrivee: string; heureDepart: string };

/** Cree plusieurs saisies manuelles d'un coup pour un meme professeur (un
 * jour reel par ligne : date + heure d'arrivee + heure de depart) - voir
 * src/app/admin/heures-manuelles/SaisieManuelleForm.tsx pour le formulaire
 * a lignes dynamiques cote client. Une route API plutot qu'une server
 * action : le nombre de lignes est variable, plus simple a encoder en JSON
 * qu'en FormData classique. */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { professeurId, periodeId, motif, lignes } = (await request.json()) as {
    professeurId?: number;
    periodeId?: number;
    motif?: string;
    lignes?: LigneEntree[];
  };

  if (!professeurId || !periodeId) {
    return NextResponse.json({ erreur: "Professeur et période obligatoires." }, { status: 400 });
  }
  if (!motif || !motif.trim()) {
    return NextResponse.json({ erreur: "Le motif est obligatoire." }, { status: 400 });
  }
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ erreur: "Au moins une ligne (date, arrivée, départ) est requise." }, { status: 400 });
  }

  const donnees: Array<{
    professeurId: number;
    periodeId: number;
    date: Date;
    heureArriveeMin: number;
    heureDepartMin: number;
    dureeMin: number;
    motif: string;
    saisieParId: number;
  }> = [];

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    const date = new Date(l.date);
    if (!l.date || Number.isNaN(date.getTime())) {
      return NextResponse.json({ erreur: `Ligne ${i + 1} : date invalide.` }, { status: 400 });
    }
    const arrivee = parseHeureFrancaise(l.heureArrivee ?? "");
    const depart = parseHeureFrancaise(l.heureDepart ?? "");
    if (arrivee === null || depart === null) {
      return NextResponse.json({ erreur: `Ligne ${i + 1} : heure d'arrivée ou de départ invalide.` }, { status: 400 });
    }
    if (depart <= arrivee) {
      return NextResponse.json({ erreur: `Ligne ${i + 1} : l'heure de départ doit être postérieure à l'heure d'arrivée.` }, { status: 400 });
    }
    donnees.push({
      professeurId,
      periodeId,
      date,
      heureArriveeMin: arrivee,
      heureDepartMin: depart,
      dureeMin: depart - arrivee,
      motif: motif.trim(),
      saisieParId: session.userId,
    });
  }

  await prisma.saisieHeuresManuelle.createMany({ data: donnees });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "SAISIE_HEURES_MANUELLE",
    tableConcernee: "saisies_heures_manuelles",
    idEnregistrement: professeurId,
    nouvelleValeur: `${donnees.length} ligne(s), ${(donnees.reduce((s, d) => s + d.dureeMin, 0) / 60).toFixed(2)} h au total`,
    motif: motif.trim(),
  });

  return NextResponse.json({ ok: true, nbLignes: donnees.length });
}
