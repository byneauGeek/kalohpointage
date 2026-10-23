"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  CalendarRange,
  Calculator,
  FileCheck2,
  ClipboardEdit,
  Settings,
  UserCog,
  ScrollText,
  LogOut,
  KeyRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

const LIENS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/professeurs", label: "Professeurs", icon: Users },
  { href: "/admin/classes", label: "Classes", icon: School },
  { href: "/admin/matieres", label: "Matières", icon: BookOpen },
  { href: "/admin/emploi-du-temps", label: "Emploi du temps", icon: CalendarClock },
  { href: "/admin/cours", label: "Cours", icon: ClipboardCheck },
  { href: "/admin/validation", label: "Validation", icon: FileCheck2 },
  { href: "/admin/periodes", label: "Périodes", icon: CalendarRange },
  { href: "/admin/comptabilisation", label: "Comptabilisation", icon: Calculator },
  { href: "/admin/heures-manuelles", label: "Heures manuelles", icon: ClipboardEdit },
  { href: "/admin/rapports", label: "Rapports", icon: ScrollText },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: UserCog },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
];

export function Sidebar({ nomUtilisateur, role }: { nomUtilisateur?: string | null; role?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col bg-[var(--color-navy-950)] text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <BrandMark size="sm" dark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {LIENS.map((l) => {
          const actif = pathname === l.href;
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href} className="relative block">
              <div
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  actif ? "text-[var(--color-navy-950)]" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {actif && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-[var(--color-gold-400)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={17} className="relative z-10 flex-shrink-0" />
                <span className="relative z-10">{l.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-xs text-white/50">
          {nomUtilisateur} · {role}
        </p>
        <Link
          href="/admin/mon-compte"
          className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-[var(--color-gold-300)]"
        >
          <KeyRound size={14} />
          Mon compte
        </Link>
        <form action="/api/auth/logout" method="post" className="mt-1">
          <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-[var(--color-gold-300)]">
            <LogOut size={14} />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
