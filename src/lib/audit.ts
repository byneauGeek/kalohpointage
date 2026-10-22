import { prisma } from "@/lib/db";

/** Ecriture centralisee dans Audit - toute action sensible doit passer par
 * ici (validation exceptionnelle, cloture, reouverture, modification de
 * parametres, correction manuelle...). Voir Journal_Decisions.md D11. */
export async function enregistrerAudit(params: {
  utilisateurId: number;
  action: string;
  tableConcernee?: string;
  idEnregistrement?: number;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  motif?: string;
}) {
  await prisma.audit.create({
    data: {
      utilisateurId: params.utilisateurId,
      action: params.action,
      tableConcernee: params.tableConcernee,
      idEnregistrement: params.idEnregistrement,
      ancienneValeur: params.ancienneValeur,
      nouvelleValeur: params.nouvelleValeur,
      motif: params.motif,
    },
  });
}
