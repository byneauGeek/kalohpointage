import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import ClasseSelector from "./ClasseSelector";

export default async function PageAffectations() {
  await exigerRole(["ADMIN"]);
  const classes = await prisma.classe.findMany({ where: { actif: true }, orderBy: { nomClasse: "asc" } });

  return (
    <div>
      <PageHeader
        title="Affectations d'enseignement"
        description="Qui enseigne quelle matière à quelle classe, et combien de séances par semaine - entrée du générateur automatique."
      />
      <Card className="max-w-xl">
        <CardTitle>Choisir une classe</CardTitle>
        <ClasseSelector classes={classes.map((c) => ({ id: c.id, label: c.nomClasse }))} />
      </Card>
    </div>
  );
}
