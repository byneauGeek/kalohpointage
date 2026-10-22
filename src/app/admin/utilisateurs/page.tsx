import { UserPlus, KeyRound } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creerCompteAdminOuComptable, definirPinProfesseur } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageUtilisateurs() {
  await exigerRole(["ADMIN"]);
  const [utilisateurs, professeurs] = await Promise.all([
    prisma.utilisateur.findMany({ where: { role: { in: ["ADMIN", "COMPTABLE"] } }, orderBy: { nomUtilisateur: "asc" } }),
    prisma.professeur.findMany({ where: { actif: true }, include: { utilisateur: true }, orderBy: { nom: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Utilisateurs" description="Comptes d'administration et codes PIN des professeurs" />

      <Reveal>
        <Card className="mb-8 max-w-xl">
          <CardTitle>Comptes Administrateur / Comptable</CardTitle>
          <form action={creerCompteAdminOuComptable} className="mb-4 flex flex-wrap items-end gap-2">
            <Input name="nomUtilisateur" placeholder="Identifiant" required className="flex-1 min-w-[140px]" />
            <Input name="motDePasse" type="password" placeholder="Mot de passe (8+)" required className="flex-1 min-w-[140px]" />
            <Select name="role" className="w-auto">
              <option value="ADMIN">Administrateur</option>
              <option value="COMPTABLE">Comptable</option>
            </Select>
            <Button type="submit" size="sm"><UserPlus size={14} />Créer</Button>
          </form>
          <ul className="flex flex-wrap gap-2">
            {utilisateurs.map((u) => (
              <li key={u.id}><Badge tone={u.role === "ADMIN" ? "gold" : "neutral"}>{u.nomUtilisateur} · {u.role}</Badge></li>
            ))}
          </ul>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="max-w-xl">
          <CardTitle>Code PIN des professeurs (pointage)</CardTitle>
          <div className="flex flex-col gap-2">
            {professeurs.map((p) => (
              <form key={p.id} action={definirPinProfesseur} className="flex items-center gap-2 rounded-lg border border-[var(--color-navy-900)]/8 p-2.5">
                <input type="hidden" name="professeurId" value={p.id} />
                <span className="flex-1 text-sm text-[var(--color-navy-900)]/80">
                  {p.nom} {p.prenom}{" "}
                  {p.utilisateur?.codePinHash ? (
                    <Badge tone="success">PIN défini</Badge>
                  ) : (
                    <Badge tone="danger">Sans PIN</Badge>
                  )}
                </span>
                <Input name="pin" placeholder="4-8 chiffres" className="w-32" />
                <Button type="submit" size="sm" variant="outline"><KeyRound size={14} />Définir</Button>
              </form>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
