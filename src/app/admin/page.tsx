import { Users, School, AlertTriangle, CalendarClock, FileBarChart, FileSignature, Printer } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Select } from "@/components/ui/Field";
import { optionsMoisCalendaire } from "@/lib/moisCalendaire";

const OPTIONS_MOIS = optionsMoisCalendaire();

export default async function TableauDeBord() {
  await exigerRole(["ADMIN", "COMPTABLE"]);

  const [nbProfs, nbClasses, nbCoursAControler, nbCoursPlanifies] = await Promise.all([
    prisma.professeur.count({ where: { actif: true } }),
    prisma.classe.count({ where: { actif: true } }),
    prisma.cours.count({ where: { statut: "A_CONTROLER" } }),
    prisma.cours.count({ where: { statut: "PLANIFIE" } }),
  ]);

  return (
    <div>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble du Collège Privé Kaloh" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Professeurs actifs" value={nbProfs} icon={<Users size={18} />} tone="navy" delay={0} />
        <StatCard label="Classes actives" value={nbClasses} icon={<School size={18} />} tone="navy" delay={0.05} />
        <StatCard label="Cours à contrôler" value={nbCoursAControler} icon={<AlertTriangle size={18} />} tone="warning" delay={0.1} />
        <StatCard label="Cours planifiés" value={nbCoursPlanifies} icon={<CalendarClock size={18} />} tone="gold" delay={0.15} />
      </div>

      <Reveal delay={0.2}>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-navy-900)]/5 text-[var(--color-navy-900)]">
              <FileBarChart size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--color-navy-900)]">Rapport du mois</h3>
              <p className="mt-1 text-sm text-[var(--color-navy-900)]/55">
                Heures validées et montants dus par professeur, avec signature comptable et direction.
              </p>
              <form action="/api/admin/rapport-mensuel" method="GET" target="_blank" className="mt-3 flex flex-wrap items-center gap-2">
                <Select name="periode" defaultValue={OPTIONS_MOIS[0].valeur} className="w-auto">
                  {OPTIONS_MOIS.map((m) => (
                    <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
                  ))}
                </Select>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-navy-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-navy-700)]"
                >
                  <Printer size={15} />
                  Imprimer
                </button>
              </form>
            </div>
          </Card>

          <Card className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold-300)]/25 text-[var(--color-gold-600)]">
              <FileSignature size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--color-navy-900)]">Fiche d&apos;émargement</h3>
              <p className="mt-1 text-sm text-[var(--color-navy-900)]/55">
                Nom, matière(s), heures, montant dû et signature par professeur.
              </p>
              <form action="/api/admin/emargement" method="GET" target="_blank" className="mt-3 flex flex-wrap items-center gap-2">
                <Select name="periode" defaultValue={OPTIONS_MOIS[0].valeur} className="w-auto">
                  {OPTIONS_MOIS.map((m) => (
                    <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
                  ))}
                </Select>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-navy-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-navy-700)]"
                >
                  <Printer size={15} />
                  Imprimer
                </button>
              </form>
            </div>
          </Card>
        </div>
      </Reveal>
    </div>
  );
}
