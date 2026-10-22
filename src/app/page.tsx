import Link from "next/link";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { Crest } from "@/components/brand/Crest";
import { Button } from "@/components/ui/Button";

export default function Accueil() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[var(--color-navy-950)] px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, var(--color-gold-400) 0, transparent 35%), radial-gradient(circle at 80% 70%, var(--color-gold-400) 0, transparent 35%)",
        }}
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center animate-fade-in-up">
        <Crest size={84} />
        <h1 className="mt-6 font-display text-3xl font-semibold text-white sm:text-4xl">Collège Privé Kaloh</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-[var(--color-gold-300)]">
          Gestion des heures d&apos;enseignement
        </p>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
          Pointage des professeurs, suivi des heures, validation et comptabilisation de la paie — en un seul système.
        </p>

        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/pointage" className="w-full sm:w-auto">
            <Button variant="gold" size="lg" className="w-full">
              <ClipboardCheck size={18} />
              Pointage professeurs
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full !border-white/20 !bg-transparent !text-white hover:!bg-white/5">
              <ShieldCheck size={18} />
              Administration
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
