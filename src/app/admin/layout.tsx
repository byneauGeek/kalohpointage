import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await lireSession();
  const utilisateur = session ? await prisma.utilisateur.findUnique({ where: { id: session.userId } }) : null;

  return (
    <div className="flex min-h-full flex-1 bg-[var(--background)]">
      <Sidebar nomUtilisateur={utilisateur?.nomUtilisateur} role={session?.role} />
      <main className="flex-1 overflow-auto px-8 py-8">{children}</main>
    </div>
  );
}
