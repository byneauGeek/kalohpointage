/**
 * Portage de mdl_Rapports/mdl_Hash (LOT 10) : numerotation, snapshot canonique
 * et empreinte SHA-256 pour l'authenticite des rapports. Le hash porte sur le
 * snapshot FIGE (DonneesCanoniquesJSON), jamais sur une relecture live des
 * tables - sinon une correction legitime des donnees source invaliderait a
 * tort tous les anciens rapports (voir Architecture_Technique.md §6).
 */
import { prisma } from "@/lib/db";
import { sha256Hex, genererCodeVerification } from "@/lib/crypto";
import { calculerComptabilisation, type LigneComptabilisation } from "@/lib/comptabilisation";

/** Representation deterministe : champs tries, format fixe, independante de
 * la locale ou de l'ordre d'insertion. C'EST cette chaine qui est hachee ET
 * stockee telle quelle - jamais recalculee depuis les tables vivantes. */
export function construireSnapshotCanonique(periodeLibelle: string, lignes: LigneComptabilisation[]): string {
  const trieess = [...lignes].sort((a, b) => a.matricule.localeCompare(b.matricule));
  const objet = {
    periode: periodeLibelle,
    lignes: trieess.map((l) => ({
      matricule: l.matricule,
      nom: l.nom,
      prenom: l.prenom,
      statut: l.statut,
      minutesValidees: l.minutesValidees,
      quotaMin: l.quotaMin,
      minutesSupp: l.minutesSupp,
      tauxApplique: l.tauxApplique.toFixed(2),
      salaireFixe: l.salaireFixe.toFixed(2),
      montantSupp: l.montantSupp.toFixed(2),
      montant: l.montant.toFixed(2),
    })),
  };
  return JSON.stringify(objet); // ordre des cles stable car construit explicitement ci-dessus
}

async function prochainNumeroRapport(periodeLibelle: string): Promise<string> {
  // periodeLibelle attendu "AAAA-MM"
  const prefixe = `RPT-${periodeLibelle}-`;
  const existants = await prisma.rapport.findMany({
    where: { numeroRapport: { startsWith: prefixe } },
    select: { numeroRapport: true },
  });
  const n = existants.length === 0 ? 1 : existants.length + 1;
  return `${prefixe}${String(n).padStart(6, "0")}`;
}

export async function genererRapport(params: {
  periodeId: number;
  typeRapport: string;
  utilisateurId: number;
}) {
  const periode = await prisma.periode.findUniqueOrThrow({ where: { id: params.periodeId } });

  const regleActive = await prisma.regleValidation.findFirst({
    where: { actif: true },
    orderBy: { dateApplication: "desc" },
  });
  const tauxApplique = periode.tauxHoraireApplique
    ? Number(periode.tauxHoraireApplique)
    : Number(regleActive?.tauxHoraireGeneral ?? 0);

  const lignes = await calculerComptabilisation(periode.dateDebut, periode.dateFin, tauxApplique, periode.id);
  const snapshot = construireSnapshotCanonique(periode.libelle, lignes);
  const hash = sha256Hex(snapshot);
  const codeVerification = genererCodeVerification();

  const precedent = await prisma.rapport.findFirst({
    where: { periodeId: periode.id, typeRapport: params.typeRapport, statut: "OFFICIEL" },
    orderBy: { version: "desc" },
  });

  let numero: string;
  let version: number;
  if (precedent) {
    numero = precedent.numeroRapport;
    version = precedent.version + 1;
    await prisma.rapport.update({ where: { id: precedent.id }, data: { statut: "REMPLACE" } });
  } else {
    numero = await prochainNumeroRapport(periode.libelle);
    version = 1;
  }

  const heuresTotalesMin = lignes.reduce((s, l) => s + l.minutesValidees, 0);
  const montantTotal = lignes.reduce((s, l) => s + l.montant, 0);

  const rapport = await prisma.rapport.create({
    data: {
      numeroRapport: numero,
      version,
      periodeId: periode.id,
      typeRapport: params.typeRapport,
      genereParId: params.utilisateurId,
      heuresTotalesMin,
      montantTotal,
      donneesCanoniquesJson: snapshot,
      hashRapport: hash,
      codeVerification,
      statut: "OFFICIEL",
    },
  });

  return { rapport, lignes };
}

export type ResultatControle =
  | { authentique: true; rapport: Awaited<ReturnType<typeof prisma.rapport.findFirst>> }
  | { authentique: false; motif: string };

export async function controlerRapport(numeroRapport: string, codeVerification: string): Promise<ResultatControle> {
  const rapport = await prisma.rapport.findFirst({
    where: { numeroRapport, codeVerification },
    orderBy: { version: "desc" },
  });
  if (!rapport) {
    return { authentique: false, motif: "Numero ou code de verification inconnu." };
  }
  const hashRecalcule = sha256Hex(rapport.donneesCanoniquesJson);
  if (hashRecalcule !== rapport.hashRapport) {
    return { authentique: false, motif: "ANOMALIE DETECTEE : le hash recalcule ne correspond pas." };
  }
  return { authentique: true, rapport };
}
