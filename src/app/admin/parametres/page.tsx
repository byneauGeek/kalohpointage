import { Save, Settings, CalendarPlus, KeyRound } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enregistrerRegleValidation, enregistrerNomEtablissement, cloturerAnneeScolaire, genererJetonPointageAction } from "./actions";
import { jetonActif, DUREE_JETON_HEURES } from "@/lib/jetonPointage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR: Record<string, string> = {
  confirmation: 'Clôture annulée : vous devez taper exactement "CONFIRMER".',
  date: "Date de rentrée invalide.",
};

export default async function PageParametres({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  await exigerRole(["ADMIN"]);
  const { erreur, succes } = await searchParams;
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const nomEtablissement = await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } });
  const creneauxOuverts = await prisma.emploiDuTemps.count({ where: { actif: true, dateFinValidite: null } });
  const jeton = await jetonActif();

  return (
    <div>
      <PageHeader title="Paramètres" description="Identité de l'établissement et règles de validation" />

      <Reveal>
        <Card className="mb-8 max-w-md">
          <CardTitle>Établissement</CardTitle>
          <form action={enregistrerNomEtablissement} className="flex items-end gap-2">
            <Input name="nomEtablissement" defaultValue={nomEtablissement?.valeur ?? "Collège Privé Kaloh"} className="flex-1" />
            <Button type="submit" size="sm"><Save size={14} />Enregistrer</Button>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="max-w-xl">
          <CardTitle>Règles de validation</CardTitle>
          <form action={enregistrerRegleValidation} className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-sm text-[var(--color-navy-900)]/55">
              Ces règles s&apos;appliquent à la prochaine « Appliquer les règles de validation » ; les cours déjà
              validés ne sont jamais recalculés.
            </p>
            <div>
              <Label>Tolérance arrivée (min)</Label>
              <Input name="toleranceArriveeMin" type="number" defaultValue={regle?.toleranceArriveeMin ?? 10} required />
            </div>
            <div>
              <Label>Tolérance départ (min)</Label>
              <Input name="toleranceDepartMin" type="number" defaultValue={regle?.toleranceDepartMin ?? 10} required />
            </div>
            <div>
              <Label>Retard maximal accepté (min)</Label>
              <Input name="retardMaxAccepteMin" type="number" defaultValue={regle?.retardMaxAccepteMin ?? 30} required />
            </div>
            <div>
              <Label>Délai avant absence (min)</Label>
              <Input name="delaiAbsenceMin" type="number" defaultValue={regle?.delaiAbsenceMin ?? 20} required />
            </div>
            <div>
              <Label>Arrondi (min, 0 = aucun)</Label>
              <Input name="arrondiMin" type="number" defaultValue={regle?.arrondiMin ?? 0} />
            </div>
            <div>
              <Label>Sens de l&apos;arrondi</Label>
              <Select name="sensArrondi" defaultValue={regle?.sensArrondi ?? "PLUS_PROCHE"}>
                <option value="PLUS_PROCHE">Au plus proche</option>
                <option value="INFERIEUR">Inférieur</option>
                <option value="SUPERIEUR">Supérieur</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Taux horaire général</Label>
              <Input name="tauxHoraireGeneral" type="number" step="0.01" defaultValue={regle ? Number(regle.tauxHoraireGeneral) : undefined} required />
            </div>
            <div className="col-span-2">
              <Button type="submit">
                <Settings size={16} />
                Enregistrer les règles
              </Button>
            </div>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.16}>
        <Card className="mt-8 max-w-xl">
          <CardTitle>Rentrée scolaire</CardTitle>
          <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
            Clôture l&apos;emploi du temps actuel ({creneauxOuverts} créneau{creneauxOuverts > 1 ? "x" : ""} sans date
            de fin) à la veille de la date choisie. Les créneaux ne sont pas supprimés, seulement archivés : un
            nouvel import pour la nouvelle année ne les chevauchera plus.
          </p>

          {succes === "cloture" && (
            <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
              Emploi du temps clôturé avec succès.
            </p>
          )}
          {erreur && MESSAGES_ERREUR[erreur] && (
            <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {MESSAGES_ERREUR[erreur]}
            </p>
          )}

          <form action={cloturerAnneeScolaire} className="flex flex-wrap items-end gap-2">
            <div>
              <Label>Date de la nouvelle rentrée</Label>
              <Input name="dateRentree" type="date" required />
            </div>
            <div>
              <Label>Tapez CONFIRMER</Label>
              <Input name="confirmation" placeholder="CONFIRMER" required className="w-40" />
            </div>
            <Button type="submit" variant="outline" size="sm">
              <CalendarPlus size={14} />
              Clôturer l&apos;année en cours
            </Button>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.24}>
        <Card className="mt-8 max-w-xl">
          <CardTitle>Accès au poste de pointage</CardTitle>
          <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
            Code valable {DUREE_JETON_HEURES}h à communiquer aux postes autorisés à ouvrir l&apos;écran de pointage
            (<code>/pointage</code>). Chaque appareil ne le saisit qu&apos;une fois : il reste ensuite reconnu
            jusqu&apos;à l&apos;expiration de ce code, même s&apos;il est généré depuis un autre poste. Générer un
            nouveau code invalide immédiatement l&apos;ancien.
          </p>

          {jeton ? (
            <div className="mb-4 rounded-lg bg-[var(--color-navy-900)]/5 px-4 py-3">
              <p className="font-mono text-2xl font-semibold tracking-[0.3em] text-[var(--color-navy-900)]">{jeton.code}</p>
              <p className="mt-1 text-xs text-[var(--color-navy-900)]/50">
                Expire le {jeton.expireLe.toLocaleString("fr-FR")}
              </p>
            </div>
          ) : (
            <p className="mb-4 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]">
              Aucun code actif : l&apos;écran de pointage demandera un code à chaque nouvel appareil.
            </p>
          )}

          <form action={genererJetonPointageAction}>
            <Button type="submit" variant="outline" size="sm">
              <KeyRound size={14} />
              Générer un nouveau code
            </Button>
          </form>
        </Card>
      </Reveal>
    </div>
  );
}
