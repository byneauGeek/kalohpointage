import { Users, School, AlertTriangle, CalendarClock } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/admin/StatCard";

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
    </div>
  );
}
