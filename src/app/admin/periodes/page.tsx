import { CalendarRange, Lock, Unlock } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creerPeriode, cloturerPeriode, reouvrirPeriode } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatutBadge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR: Record<string, string> = {
  invalide: "Libellé et dates obligatoires.",
  ordre: "La date de fin doit être postérieure à la date de début.",
  anomalies: "Impossible de clôturer : des anomalies restent non traitées (voir Validation).",
  motif: "Le motif de réouverture est obligatoire.",
};
const MESSAGES_SUCCES: Record<string, string> = {
  creee: "Période créée.",
  cloturee: "Période clôturée.",
  reouverte: "Période rouverte.",
};

export default async function PagePeriodes({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const estAdmin = session.role === "ADMIN";
  const { erreur, succes } = await searchParams;
  const periodes = await prisma.periode.findMany({ orderBy: { dateDebut: "desc" } });

  return (
    <div>
      <PageHeader title="Périodes" description="Cycles de paie, clôture et réouverture" />

      {succes && MESSAGES_SUCCES[succes] && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          {MESSAGES_SUCCES[succes]}
        </p>
      )}
      {erreur && MESSAGES_ERREUR[erreur] && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {MESSAGES_ERREUR[erreur]}
        </p>
      )}

      {estAdmin && (
        <Reveal>
          <Card className="mb-8 max-w-xl">
            <form action={creerPeriode} className="flex flex-wrap items-end gap-2">
              <Input name="libelle" placeholder="2026-09" required className="w-28" />
              <Input type="date" name="dateDebut" required />
              <Input type="date" name="dateFin" required />
              <Button type="submit">
                <CalendarRange size={16} />
                Créer
              </Button>
            </form>
          </Card>
        </Reveal>
      )}

      <div className="flex max-w-3xl flex-col gap-3">
        {periodes.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.03}>
            <Card className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--color-navy-900)]">{p.libelle}</p>
                  <StatutBadge statut={p.statut} />
                </div>
                <p className="mt-1 text-xs text-[var(--color-navy-900)]/50">
                  {p.dateDebut.toISOString().slice(0, 10)} au {p.dateFin.toISOString().slice(0, 10)}
                </p>
              </div>
              {estAdmin &&
                (p.statut === "OUVERTE" ? (
                  <form action={cloturerPeriode.bind(null, p.id)}>
                    <Button type="submit" variant="primary" size="sm">
                      <Lock size={14} />
                      Clôturer
                    </Button>
                  </form>
                ) : (
                  <form action={reouvrirPeriode} className="flex gap-2">
                    <input type="hidden" name="periodeId" value={p.id} />
                    <Input name="motif" required placeholder="Motif de réouverture" className="w-48" />
                    <Button type="submit" variant="outline" size="sm">
                      <Unlock size={14} />
                      Rouvrir
                    </Button>
                  </form>
                ))}
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
