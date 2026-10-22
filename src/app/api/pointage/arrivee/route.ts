import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifierJetonAction } from "@/lib/session";
import { blocContigu, combinerDateEtMinutes, aujourdhuiUTC } from "@/lib/pointage";

/** Pointe le debut de TOUT le bloc de cours contigus a partir du cours
 * ancre (voir lib/pointage.ts). Ecrit Now() A CET INSTANT comme heure
 * d'arrivee du PREMIER cours seulement - jamais une valeur affichee a
 * l'ecran avant l'appel (regle §37). Les cours suivants du meme bloc
 * recoivent leur propre heure de debut PREVUE (le professeur etait deja
 * present, pas de pointage individuel entre deux cours enchaines).
 * Verrou optimiste (D12) sur le cours ancre : rejette si son etat a change
 * entre-temps (double clic, jeton reutilise). */
export async function POST(request: Request) {
  const { jeton } = await request.json();
  const payload = jeton ? await verifierJetonAction(jeton) : null;
  if (!payload || payload.action !== "ARRIVEE") {
    return NextResponse.json({ erreur: "Action invalide ou expiree, recommencez." }, { status: 401 });
  }

  const ancre = await prisma.cours.findUnique({ where: { id: payload.coursId } });
  if (!ancre || ancre.professeurId !== payload.professeurId || ancre.statut !== "PLANIFIE") {
    return NextResponse.json({ erreur: "Ce cours n'est plus en attente d'arrivee." }, { status: 409 });
  }

  const planifies = await prisma.cours.findMany({
    where: { professeurId: payload.professeurId, dateCours: aujourdhuiUTC(), statut: "PLANIFIE" },
    orderBy: { heureDebutPrevueMin: "asc" },
    include: { classe: true, matiere: true },
  });
  const depart = planifies.findIndex((c) => c.id === ancre.id);
  const bloc = blocContigu(planifies.slice(depart === -1 ? 0 : depart));

  const maintenant = new Date();

  await prisma.$transaction(
    bloc.map((c, i) =>
      prisma.cours.update({
        where: { id: c.id },
        data: {
          statut: "EN_COURS",
          heureArriveeReelle: i === 0 ? maintenant : combinerDateEtMinutes(c.dateCours, c.heureDebutPrevueMin),
        },
      })
    )
  );

  return NextResponse.json({ ok: true, heure: maintenant.toISOString(), nbSessions: bloc.length });
}
