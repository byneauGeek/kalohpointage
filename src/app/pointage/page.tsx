"use client";
/**
 * Poste de pointage "kiosque" (portage de F_Accueil/F_SaisiePIN/
 * F_PointageProfesseur). Flux atomique : selection du nom -> PIN -> UNE
 * action -> retour automatique a l'accueil. Jamais de session professeur qui
 * reste ouverte (D02-D04).
 *
 * Gere les BLOCS DE COURS ENCHAINES (voir src/lib/pointage.ts) : un
 * professeur qui a plusieurs cours consecutifs pointe une seule fois
 * "debut" et une seule fois "fin" pour tout le bloc - l'ecran liste alors
 * les sessions concernees par l'action en cours.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Delete, CheckCircle2, LogIn, LogOut as LogOutIcon, Clock, ShieldCheck } from "lucide-react";
import { Crest } from "@/components/brand/Crest";
import { Button } from "@/components/ui/Button";

type Professeur = { id: number; nom: string; prenom: string };
type SessionInfo = { classe: string; matiere: string; heureDebutPrevueMin: number; heureFinPrevueMin: number };
type Etape = "VERIFICATION" | "JETON" | "LISTE" | "PIN" | "ACTION" | "ATTENTE" | "CONFIRMATION";
type Action = "ARRIVEE" | "FIN" | "ATTENTE_DEBUT" | "ATTENTE_FIN";

function Horloge() {
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  useEffect(() => {
    setMaintenant(new Date());
    const t = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!maintenant) return <span className="tabular-nums">--:--:--</span>;
  return <span className="tabular-nums">{maintenant.toLocaleTimeString("fr-FR")}</span>;
}

function formatMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}h${String(min % 60).padStart(2, "0")}`;
}

function ListeSessions({ sessions }: { sessions: SessionInfo[] }) {
  if (sessions.length === 0) return null;
  if (sessions.length === 1) {
    const s = sessions[0];
    return (
      <p className="mt-2 text-white/70">
        {s.matiere} — {s.classe}
        <span className="block text-sm text-white/40">{formatMin(s.heureDebutPrevueMin)} - {formatMin(s.heureFinPrevueMin)}</span>
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-1.5 text-sm">
      <p className="text-white/50">{sessions.length} cours enchaînés, sans heure creuse :</p>
      {sessions.map((s, i) => (
        <p key={i} className="text-white/70">
          <span className="font-mono text-white/40">{formatMin(s.heureDebutPrevueMin)}-{formatMin(s.heureFinPrevueMin)}</span>{" "}
          {s.matiere} — {s.classe}
        </p>
      ))}
    </div>
  );
}

const transitionEtape = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

export default function PagePointage() {
  const [etape, setEtape] = useState<Etape>("VERIFICATION");
  const [codeAppareil, setCodeAppareil] = useState("");
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [envoiCode, setEnvoiCode] = useState(false);
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);
  const [profSelectionne, setProfSelectionne] = useState<Professeur | null>(null);
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [jeton, setJeton] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [minutesRestantes, setMinutesRestantes] = useState<number | null>(null);
  const [echecsPin, setEchecsPin] = useState(0);

  useEffect(() => {
    fetch("/api/pointage/jeton-appareil")
      .then((r) => r.json())
      .then((d) => setEtape(d.confiance ? "LISTE" : "JETON"))
      .catch(() => setEtape("JETON"));
  }, []);

  useEffect(() => {
    if (etape === "LISTE") {
      fetch("/api/pointage/professeurs")
        .then((r) => r.json())
        .then(setProfesseurs)
        .catch(() => setProfesseurs([]));
    }
  }, [etape]);

  async function validerCodeAppareil() {
    setEnvoiCode(true);
    setErreurCode(null);
    const reponse = await fetch("/api/pointage/jeton-appareil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeAppareil }),
    });
    const data = await reponse.json();
    setEnvoiCode(false);
    if (!reponse.ok) {
      setErreurCode(data.erreur ?? "Code incorrect.");
      return;
    }
    setCodeAppareil("");
    setEtape("LISTE");
  }

  function retourAccueil() {
    setEtape("LISTE");
    setProfSelectionne(null);
    setPin("");
    setErreur(null);
    setJeton(null);
    setAction(null);
    setSessions([]);
    setMessage(null);
    setEnvoi(false);
    setMinutesRestantes(null);
    setEchecsPin(0);
  }

  async function validerPin(pinSaisi: string) {
    setErreur(null);
    setEnvoi(true);
    const reponse = await fetch("/api/pointage/verifier-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professeurId: profSelectionne?.id, pin: pinSaisi }),
    });
    const data = await reponse.json();
    setEnvoi(false);
    if (!reponse.ok) {
      const tentatives = echecsPin + 1;
      setEchecsPin(tentatives);
      setErreur(data.erreur ?? "Erreur inconnue.");
      setPin("");
      // Trois echecs -> retour automatique a l'accueil (specification
      // d'origine), le serveur bloque deja les tentatives au-dela (429).
      if (tentatives >= 3) {
        setTimeout(retourAccueil, 1800);
      }
      return;
    }
    setEchecsPin(0);
    setSessions(data.sessions ?? []);
    setAction(data.action);
    if (data.action === "ATTENTE_DEBUT" || data.action === "ATTENTE_FIN") {
      setMinutesRestantes(data.minutesRestantes);
      setEtape("ATTENTE");
      setTimeout(retourAccueil, 6000);
      return;
    }
    setJeton(data.jeton);
    setEtape("ACTION");
  }

  function saisirChiffre(c: string) {
    if (envoi || pin.length >= 8) return;
    const nouveau = pin + c;
    setPin(nouveau);
    setErreur(null);
    if (nouveau.length >= 4) {
      // Validation auto a 4 chiffres (ergonomie kiosque tactile), mais permet
      // jusqu'a 8 si le PIN est plus long.
      setTimeout(() => validerPin(nouveau), 120);
    }
  }

  async function pointer() {
    setEnvoi(true);
    const route = action === "ARRIVEE" ? "/api/pointage/arrivee" : "/api/pointage/fin";
    const reponse = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jeton }),
    });
    const data = await reponse.json();
    setEnvoi(false);
    if (!reponse.ok) {
      setMessage(data.erreur ?? "Erreur, recommencez.");
    } else {
      const pluriel = (data.nbSessions ?? 1) > 1 ? ` (${data.nbSessions} cours)` : "";
      setMessage(
        action === "ARRIVEE" ? `Arrivée enregistrée${pluriel}. Bon cours !` : `Fin de cours enregistrée${pluriel}. Merci !`
      );
    }
    setEtape("CONFIRMATION");
    setTimeout(retourAccueil, 3000);
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--color-navy-950)] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, var(--color-gold-400) 0, transparent 30%), radial-gradient(circle at 85% 85%, var(--color-gold-400) 0, transparent 30%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <Crest size={34} />
        <span className="text-sm text-white/50">
          <Horloge />
        </span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-16">
        <AnimatePresence mode="wait">
          {etape === "JETON" && (
            <motion.div key="jeton" {...transitionEtape} className="flex w-full max-w-sm flex-col items-center text-center">
              <ShieldCheck size={44} className="text-[var(--color-gold-400)]" />
              <h1 className="mt-4 font-display text-2xl font-semibold">Accès au poste de pointage</h1>
              <p className="mb-6 mt-2 text-sm text-white/50">
                Saisissez le code du jour fourni par l&apos;administration. Cet appareil n&apos;aura plus besoin de le
                ressaisir avant son expiration.
              </p>

              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={codeAppareil}
                onChange={(e) => {
                  setCodeAppareil(e.target.value.replace(/\D/g, ""));
                  setErreurCode(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && codeAppareil.length > 0 && !envoiCode) validerCodeAppareil();
                }}
                placeholder="------"
                className="mb-4 w-48 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white placeholder:text-white/20 focus:border-[var(--color-gold-400)]/60 focus:outline-none"
              />

              {erreurCode && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  className="mb-4 text-sm text-red-400"
                >
                  {erreurCode}
                </motion.p>
              )}

              <Button
                variant="gold"
                onClick={validerCodeAppareil}
                disabled={envoiCode || codeAppareil.length === 0}
                className="w-48"
              >
                Valider
              </Button>
            </motion.div>
          )}

          {etape === "LISTE" && (
            <motion.div key="liste" {...transitionEtape} className="flex w-full max-w-4xl flex-col items-center">
              <h1 className="mb-8 font-display text-3xl font-semibold">Sélectionnez votre nom</h1>
              {professeurs.length === 0 ? (
                <p className="text-sm text-white/40">Aucun professeur disponible pour le pointage.</p>
              ) : (
                <div className="grid max-h-[60vh] w-full grid-cols-2 gap-4 overflow-auto sm:grid-cols-3">
                  {professeurs.map((p, i) => (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setProfSelectionne(p);
                        setEtape("PIN");
                      }}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-lg font-medium backdrop-blur-sm transition-colors hover:border-[var(--color-gold-400)]/50 hover:bg-white/10"
                    >
                      {p.prenom} {p.nom}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {etape === "PIN" && profSelectionne && (
            <motion.div key="pin" {...transitionEtape} className="flex flex-col items-center">
              <h1 className="font-display text-2xl font-semibold">
                {profSelectionne.prenom} {profSelectionne.nom}
              </h1>
              <p className="mb-6 mt-1 text-sm text-white/50">Saisissez votre code PIN</p>

              <div className="mb-5 flex gap-3">
                {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{ scale: i < pin.length ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                    className={`h-3.5 w-3.5 rounded-full border border-[var(--color-gold-400)]/60 ${
                      i < pin.length ? "bg-[var(--color-gold-400)]" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>

              {erreur && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  className="mb-4 max-w-xs text-center text-sm text-red-400"
                >
                  {erreur}
                </motion.p>
              )}

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((c) => (
                  <motion.button
                    key={c}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={envoi}
                    onClick={() => saisirChiffre(c)}
                    className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 text-xl font-medium backdrop-blur-sm hover:bg-white/10 disabled:opacity-40"
                  >
                    {c}
                  </motion.button>
                ))}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={retourAccueil}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs text-white/60 hover:bg-white/10"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={envoi}
                  onClick={() => saisirChiffre("0")}
                  className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 text-xl font-medium backdrop-blur-sm hover:bg-white/10 disabled:opacity-40"
                >
                  0
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
                >
                  <Delete size={20} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {etape === "ACTION" && (action === "ARRIVEE" || action === "FIN") && (
            <motion.div key="action" {...transitionEtape} className="flex max-w-sm flex-col items-center text-center">
              <h1 className="font-display text-2xl font-semibold">
                {profSelectionne?.prenom} {profSelectionne?.nom}
              </h1>
              <ListeSessions sessions={sessions} />
              <motion.div
                animate={{ boxShadow: ["0 0 0 0 rgba(201,155,46,0.35)", "0 0 0 18px rgba(201,155,46,0)"] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="mt-10 rounded-2xl"
              >
                <Button variant="gold" size="lg" onClick={pointer} disabled={envoi} className="px-12 py-7 text-xl">
                  {action === "ARRIVEE" ? <LogIn size={22} /> : <LogOutIcon size={22} />}
                  {action === "ARRIVEE" ? "Pointer mon arrivée" : "Pointer ma fin de cours"}
                </Button>
              </motion.div>
            </motion.div>
          )}

          {etape === "ATTENTE" && (
            <motion.div key="attente" {...transitionEtape} className="flex max-w-sm flex-col items-center text-center">
              <Clock size={56} className="text-white/30" />
              <h1 className="mt-5 font-display text-2xl font-semibold">
                {profSelectionne?.prenom} {profSelectionne?.nom}
              </h1>
              <ListeSessions sessions={sessions} />
              <p className="mt-4 text-sm text-white/50">
                {action === "ATTENTE_DEBUT" ? (
                  <>
                    Il est trop tôt pour pointer votre arrivée. Votre cours commence à{" "}
                    <span className="font-medium text-[var(--color-gold-300)]">{formatMin(sessions[0]?.heureDebutPrevueMin ?? 0)}</span>
                  </>
                ) : (
                  <>
                    Il est trop tôt pour pointer votre fin de cours. Votre session se termine à{" "}
                    <span className="font-medium text-[var(--color-gold-300)]">
                      {formatMin(sessions[sessions.length - 1]?.heureFinPrevueMin ?? 0)}
                    </span>
                  </>
                )}
                {minutesRestantes != null && minutesRestantes > 0 && <> — revenez dans environ {minutesRestantes} min.</>}
              </p>
            </motion.div>
          )}

          {etape === "CONFIRMATION" && (
            <motion.div key="confirmation" {...transitionEtape} className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                <CheckCircle2 size={72} className="text-[var(--color-gold-400)]" />
              </motion.div>
              <p className="mt-6 text-2xl font-medium">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
