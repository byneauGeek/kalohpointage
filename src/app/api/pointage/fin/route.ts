import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifierJetonAction } from "@/lib/session";
import { blocContigu, combinerDateEtMinutes, aujourdhuiUTC } from "@/lib/pointage";

/** Cloture TOUT le bloc de cours contigus actuellement EN_COURS. Ecrit
 * Now() comme heure de fin du DERNIER cours du bloc seulement ; les cours
 * precedents du meme bloc recoivent leur propre heure de fin PREVUE (le
 * professeur est reste present sans redescendre entre deux cours enchaines -
 * voir lib/pointage.ts). */
export async function POST(request: Request) {
  const { jeton } = await request.json();
  const payload = jeton ? await verifierJetonAction(jeton) : null;
  if (!payload || payload.action !== "FIN") {
    return NextResponse.json({ erreur: "Action invalide ou expiree, recommencez." }, { status: 401 });
  }

  const ancre = await prisma.cours.findUnique({ where: { id: payload.coursId } });
  if (!ancre || ancre.professeurId !== payload.professeurId || ancre.statut !== "EN_COURS") {
    return NextResponse.json({ erreur: "Ce cours n'est plus en attente de fin." }, { status: 409 });
  }

  const enCours = await prisma.cours.findMany({
    where: { professeurId: payload.professeurId, dateCours: aujourdhuiUTC(), statut: "EN_COURS" },
    orderBy: { heureDebutPrevueMin: "asc" },
    include: { classe: true, matiere: true },
  });
  const depart = enCours.findIndex((c) => c.id === ancre.id);
  const bloc = blocContigu(enCours.slice(depart === -1 ? 0 : depart));

  const maintenant = new Date();
  const dernierIndex = bloc.length - 1;

  await prisma.$transaction(
    bloc.map((c, i) =>
      prisma.cours.update({
        where: { id: c.id },
        data: {
          statut: "FIN_ENREGISTREE",
          heureFinReelle: i === dernierIndex ? maintenant : combinerDateEtMinutes(c.dateCours, c.heureFinPrevueMin),
        },
      })
    )
  );

  return NextResponse.json({ ok: true, heure: maintenant.toISOString(), nbSessions: bloc.length });
}
