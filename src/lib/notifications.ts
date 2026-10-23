/**
 * Notification email de l'administration en cas d'anomalie de pointage a
 * traiter (voir src/app/admin/validation/actions.ts). Utilise l'API HTTP de
 * Resend (resend.com, pas de SDK necessaire - un simple fetch) plutot qu'un
 * fournisseur SMTP classique, plus simple a configurer et compatible
 * serverless. N'echoue JAMAIS l'action appelante si l'envoi echoue ou si
 * aucun destinataire n'est configure - meme principe de degradation
 * gracieuse que src/lib/storage.ts : une notification manquee n'est pas une
 * raison de bloquer l'application de regles de validation.
 */

function destinataires(): string[] {
  const valeur = process.env.NOTIFY_EMAIL_TO ?? "";
  return valeur.split(",").map((a) => a.trim()).filter(Boolean);
}

export async function envoyerNotificationEmail(params: { sujet: string; corpsTexte: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = destinataires();
  if (!apiKey || to.length === 0) return false;

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM ?? "Kaloh Heures <onboarding@resend.dev>",
        to,
        subject: params.sujet,
        text: params.corpsTexte,
      }),
    });
    return reponse.ok;
  } catch {
    return false;
  }
}

export async function notifierAnomaliesATraiter(nbAControler: number, baseUrl: string): Promise<void> {
  if (nbAControler <= 0) return;
  await envoyerNotificationEmail({
    sujet: `[Kaloh Heures] ${nbAControler} cours à contrôler`,
    corpsTexte: `L'application des règles de validation a laissé ${nbAControler} cours en attente de contrôle manuel.\n\nTraitez-les ici : ${baseUrl}/admin/validation`,
  });
}
