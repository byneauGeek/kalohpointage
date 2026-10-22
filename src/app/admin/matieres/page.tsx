import { BookPlus } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creerMatiere } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageMatieres() {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const matieres = await prisma.matiere.findMany({ orderBy: { libelle: "asc" } });

  return (
    <div>
      <PageHeader title="Matières" description="Référentiel des enseignements dispensés" />
      {session.role === "ADMIN" && (
        <Reveal>
          <form action={creerMatiere} className="mb-8 flex max-w-md gap-2">
            <Input name="libelle" placeholder="Nouvelle matière" required />
            <Button type="submit">
              <BookPlus size={16} />
              Ajouter
            </Button>
          </form>
        </Reveal>
      )}
      <Reveal delay={0.08}>
        <div className="flex max-w-3xl flex-wrap gap-2">
          {matieres.map((m) => (
            <Badge key={m.id}>{m.libelle}</Badge>
          ))}
          {matieres.length === 0 && <p className="text-sm text-[var(--color-navy-900)]/40">Aucune matière enregistrée.</p>}
        </div>
      </Reveal>
    </div>
  );
}
