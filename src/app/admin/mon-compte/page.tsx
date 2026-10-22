import { KeyRound } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { modifierMonCompte } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const MESSAGES_ERREUR: Record<string, string> = {
  mdp_actuel: "Mot de passe actuel incorrect.",
  aucune_modif: "Aucune modification demandée (remplissez le nouvel identifiant et/ou le nouveau mot de passe).",
  mdp_court: "Le nouveau mot de passe doit comporter au moins 8 caractères.",
  mdp_confirmation: "La confirmation ne correspond pas au nouveau mot de passe.",
  identifiant_pris: "Cet identifiant est déjà utilisé par un autre compte.",
  compte: "Compte introuvable ou mal configuré.",
};

export default async function PageMonCompte({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const { erreur, succes } = await searchParams;
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: session.userId } });

  return (
    <div>
      <PageHeader title="Mon compte" description="Identifiant et mot de passe de votre propre compte" />

      <Card className="max-w-md">
        <CardTitle>Changer mon identifiant / mot de passe</CardTitle>
        <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
          Identifiant actuel : <span className="font-medium text-[var(--color-navy-900)]">{utilisateur?.nomUtilisateur}</span> ({session.role})
        </p>

        {succes === "1" && (
          <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
            Compte mis à jour avec succès.
          </p>
        )}
        {erreur && MESSAGES_ERREUR[erreur] && (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {MESSAGES_ERREUR[erreur]}
          </p>
        )}

        <form action={modifierMonCompte} className="flex flex-col gap-4">
          <div>
            <Label>Mot de passe actuel (obligatoire)</Label>
            <Input name="motDePasseActuel" type="password" required />
          </div>
          <div>
            <Label>Nouvel identifiant (laisser vide pour ne pas changer)</Label>
            <Input name="nouvelIdentifiant" />
          </div>
          <div>
            <Label>Nouveau mot de passe (laisser vide pour ne pas changer)</Label>
            <Input name="nouveauMotDePasse" type="password" />
          </div>
          <div>
            <Label>Confirmer le nouveau mot de passe</Label>
            <Input name="confirmation" type="password" />
          </div>
          <Button type="submit" variant="gold" className="w-full">
            <KeyRound size={16} />
            Enregistrer
          </Button>
        </form>
      </Card>
    </div>
  );
}
