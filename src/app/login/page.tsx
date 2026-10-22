import { LogIn } from "lucide-react";
import { connecter } from "./actions";
import { BrandMark } from "@/components/brand/BrandMark";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default async function PageLogin({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--background)] p-6">
      <Card className="w-full max-w-sm animate-fade-in-up !p-8">
        <div className="mb-7 flex justify-center">
          <BrandMark size="md" />
        </div>
        <h1 className="mb-6 text-center text-base font-semibold text-[var(--color-navy-900)]">Connexion administration</h1>
        {erreur === "role" && (
          <p className="mb-4 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]">
            Accès refusé : votre compte n&apos;a pas les droits nécessaires pour cette page.
          </p>
        )}
        {erreur === "1" && (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
            Identifiant ou mot de passe incorrect.
          </p>
        )}
        <form action={connecter}>
          <Label>Identifiant</Label>
          <Input name="nomUtilisateur" required autoFocus className="mb-4" />
          <Label>Mot de passe</Label>
          <Input name="motDePasse" type="password" required className="mb-6" />
          <Button type="submit" variant="gold" size="md" className="w-full">
            <LogIn size={16} />
            Se connecter
          </Button>
        </form>
      </Card>
    </div>
  );
}
