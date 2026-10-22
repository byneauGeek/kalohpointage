import { Layers } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creerClassesEnMasse } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageClasses() {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const classes = await prisma.classe.findMany({ orderBy: { nomClasse: "asc" } });

  return (
    <div>
      <PageHeader title="Classes" description="Effectifs et niveaux de l'établissement" />

      {session.role === "ADMIN" && (
        <Reveal>
          <Card className="mb-8 max-w-xl">
            <CardTitle>Créer des classes en masse</CardTitle>
            <p className="mb-3 text-sm text-[var(--color-navy-900)]/55">
              Un nom de classe par ligne (ou séparés par des virgules). Une classe déjà existante n&apos;est jamais modifiée.
            </p>
            <form action={creerClassesEnMasse}>
              <Textarea name="noms" required rows={4} placeholder={"6è1\n6è2\n2ndeA1"} className="mb-3" />
              <Label>Niveau (optionnel)</Label>
              <Input name="niveau" placeholder="ex. 6eme" className="mb-4" />
              <Button type="submit">
                <Layers size={16} />
                Créer les classes
              </Button>
            </form>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <div className="flex max-w-3xl flex-wrap gap-2">
          {classes.map((c) => (
            <Badge key={c.id} tone={c.actif ? "neutral" : "danger"}>
              {c.nomClasse}
            </Badge>
          ))}
          {classes.length === 0 && <p className="text-sm text-[var(--color-navy-900)]/40">Aucune classe créée.</p>}
        </div>
      </Reveal>
    </div>
  );
}
