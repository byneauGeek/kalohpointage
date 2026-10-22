import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySecret } from "@/lib/crypto";
import { creerJetonAction } from "@/lib/session";
import { trouverCoursActuel, compteBloquePourPin, DELAI_BLOCAGE_PIN_MIN } from "@/lib/pointage";
import { enregistrerAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const { professeurId, pin } = await request.json();
  if (!professeurId || !pin) {
    return NextResponse.json({ erreur: "Donnees manquantes." }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({ where: { professeurId } });
  if (!utilisateur || !utilisateur.actif || !utilisateur.codePinHash || !utilisateur.codePinSel) {
    return NextResponse.json({ erreur: "PIN incorrect." }, { status: 401 });
  }

  if (await compteBloquePourPin(utilisateur.id, utilisateur.dernierAcces)) {
    return NextResponse.json(
      { erreur: `Trop de tentatives incorrectes. Réessayez dans ${DELAI_BLOCAGE_PIN_MIN} minutes ou contactez l'administrateur.` },
      { status: 429 }
    );
  }

  const ok = await verifySecret(String(pin), utilisateur.codePinHash, utilisateur.codePinSel);
  if (!ok) {
    await enregistrerAudit({
      utilisateurId: utilisateur.id,
      action: "ECHEC_PIN",
      tableConcernee: "utilisateurs",
      idEnregistrement: utilisateur.id,
    });
    return NextResponse.json({ erreur: "PIN incorrect." }, { status: 401 });
  }

  await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { dernierAcces: new Date() } });

  const actuel = await trouverCoursActuel(professeurId);
  if (!actuel) {
    return NextResponse.json({ erreur: "Aucun cours a pointer pour vous aujourd'hui." }, { status: 404 });
  }

  // Les boutons d'action ne sont pas encore disponibles (trop tot avant le
  // debut/la fin du bloc de cours) : pas de jeton, juste l'attente.
  if (actuel.action === "ATTENTE_DEBUT" || actuel.action === "ATTENTE_FIN") {
    return NextResponse.json({
      action: actuel.action,
      minutesRestantes: actuel.minutesRestantes,
      sessions: actuel.sessions,
    });
  }

  const jeton = await creerJetonAction({
    professeurId,
    coursId: actuel.anchorCoursId,
    action: actuel.action,
  });

  return NextResponse.json({ jeton, action: actuel.action, sessions: actuel.sessions });
}
