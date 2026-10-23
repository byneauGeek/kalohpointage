/**
 * Fiche de paie (export Word) d'un professeur pour une periode : liste
 * chaque session validee avec sa matiere (un professeur peut enseigner
 * plusieurs matieres), les sous-totaux par matiere, puis le recapitulatif
 * de remuneration (identique au calcul de mdl_Comptabilisation). Mise en
 * page "bulletin officiel" : reference, encadre recapitulatif, zones de
 * signature Professeur/Comptable - document destine a etre imprime et
 * signe par les deux parties, pas seulement consulte a l'ecran.
 */
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Packer,
} from "docx";
import type { LigneComptabilisation, SessionDetail, DetailParMatiere } from "@/lib/comptabilisation";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const COULEUR_NAVY = "0B1B38";
const COULEUR_OR = "A9790A";
const COULEUR_GRIS = "6B7280";
const COULEUR_BORDURE = "D4D8E2";

const BORDURES_TABLE = {
  top: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
  left: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
  right: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COULEUR_BORDURE },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COULEUR_BORDURE },
};

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

/** Reference lisible et stable (idempotente pour un meme professeur/periode)
 * - pas une numerotation officielle au sens des Rapports (pas de hash, pas
 * d'historisation en base), juste un identifiant pour s'y retrouver sur un
 * document imprime. */
function referenceFiche(matricule: string, periodeLibelle: string): string {
  return `FP-${periodeLibelle}-${matricule}`;
}

function celluleEntete(texte: string, largeur = 20): TableCell {
  return new TableCell({
    width: { size: largeur, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: COULEUR_NAVY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: texte, bold: true, color: "FFFFFF", size: 17 })] })],
  });
}

function cellule(texte: string, opts: { gras?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; largeur?: number } = {}): TableCell {
  return new TableCell({
    width: { size: opts.largeur ?? 20, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text: texte, bold: opts.gras ?? false, size: 19 })],
      }),
    ],
  });
}

/** Cellule de signature : libelle du signataire, puis espace blanc pour la
 * signature manuscrite, puis une ligne "Date :" - pensee pour impression. */
function celluleSignature(titre: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
      left: { style: BorderStyle.SINGLE, size: 2, color: COULEUR_BORDURE },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    margins: { top: 150, bottom: 150, left: 150, right: 150 },
    children: [
      new Paragraph({ children: [new TextRun({ text: titre, bold: true, size: 20, color: COULEUR_NAVY })] }),
      new Paragraph({ children: [new TextRun({ text: "Nom : ........................................", size: 18 })], spacing: { before: 300 } }),
      new Paragraph({ children: [new TextRun({ text: "Date : ......../......../..........", size: 18 })], spacing: { before: 150 } }),
      new Paragraph({ children: [new TextRun({ text: "Signature :", size: 18 })], spacing: { before: 150 } }),
      new Paragraph({ text: "", spacing: { before: 500 } }),
    ],
  });
}

export async function genererFicheDePaieDocx(params: {
  nomEtablissement: string;
  periodeLibelle: string;
  ligne: LigneComptabilisation;
  sessions: SessionDetail[];
  parMatiere: DetailParMatiere[];
}): Promise<Buffer> {
  const { nomEtablissement, periodeLibelle, ligne, sessions, parMatiere } = params;
  const reference = referenceFiche(ligne.matricule, periodeLibelle);

  const lignesSessions = sessions.map(
    (s) =>
      new TableRow({
        children: [
          cellule(s.date.toISOString().slice(0, 10), { largeur: 18 }),
          cellule(JOURS[s.date.getUTCDay() === 0 ? 7 : s.date.getUTCDay()], { largeur: 16 }),
          cellule(s.matiere, { largeur: 28 }),
          cellule(s.classe, { largeur: 20 }),
          cellule(formatHeures(s.dureeValideeMin), { align: AlignmentType.RIGHT, largeur: 18 }),
        ],
      })
  );

  const document = new Document({
    sections: [
      {
        children: [
          // En-tete etablissement
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: nomEtablissement, bold: true, size: 32, color: COULEUR_NAVY })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "BULLETIN DE PAIE — ENSEIGNEMENT", size: 22, color: COULEUR_OR, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: `Référence ${reference}`, size: 16, color: COULEUR_GRIS, italics: true })],
          }),

          // Encadre identite professeur
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDURES_TABLE,
            rows: [
              new TableRow({
                children: [
                  celluleEntete("Professeur", 25),
                  cellule(`${ligne.nom} ${ligne.prenom}`, { gras: true, largeur: 25 }),
                  celluleEntete("Matricule", 25),
                  cellule(ligne.matricule, { largeur: 25 }),
                ],
              }),
              new TableRow({
                children: [
                  celluleEntete("Statut", 25),
                  cellule(ligne.statut, { largeur: 25 }),
                  celluleEntete("Période", 25),
                  cellule(periodeLibelle, { largeur: 25 }),
                ],
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Détail des sessions effectuées", color: COULEUR_NAVY })],
          }),
          sessions.length > 0
            ? new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDURES_TABLE,
                rows: [
                  new TableRow({
                    children: [
                      celluleEntete("Date", 18),
                      celluleEntete("Jour", 16),
                      celluleEntete("Matière", 28),
                      celluleEntete("Classe", 20),
                      celluleEntete("Durée", 18),
                    ],
                  }),
                  ...lignesSessions,
                ],
              })
            : new Paragraph({ children: [new TextRun({ text: "Aucune session validée sur cette période.", italics: true })] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Sous-totaux par matière", color: COULEUR_NAVY })],
          }),
          ...parMatiere.map(
            (m) =>
              new Paragraph({
                children: [new TextRun({ text: `${m.matiere} : ${formatHeures(m.minutes)}` })],
              })
          ),

          // Encadre recapitulatif remuneration
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Récapitulatif de rémunération", color: COULEUR_NAVY })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDURES_TABLE,
            rows: [
              new TableRow({
                children: [
                  cellule("Heures validées totales", { largeur: 65 }),
                  cellule(formatHeures(ligne.minutesValidees), { align: AlignmentType.RIGHT, largeur: 35 }),
                ],
              }),
              ...(ligne.quotaMin != null
                ? [
                    new TableRow({
                      children: [
                        cellule("Quota mensuel", { largeur: 65 }),
                        cellule(formatHeures(ligne.quotaMin), { align: AlignmentType.RIGHT, largeur: 35 }),
                      ],
                    }),
                    new TableRow({
                      children: [
                        cellule("Heures supplémentaires", { largeur: 65 }),
                        cellule(formatHeures(ligne.minutesSupp), { align: AlignmentType.RIGHT, largeur: 35 }),
                      ],
                    }),
                    new TableRow({
                      children: [
                        cellule("Salaire fixe", { largeur: 65 }),
                        cellule(ligne.salaireFixe.toFixed(2), { align: AlignmentType.RIGHT, largeur: 35 }),
                      ],
                    }),
                  ]
                : [
                    new TableRow({
                      children: [
                        cellule("Taux horaire appliqué", { largeur: 65 }),
                        cellule(ligne.tauxApplique.toFixed(2), { align: AlignmentType.RIGHT, largeur: 35 }),
                      ],
                    }),
                  ]),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 65, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: COULEUR_NAVY },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: "MONTANT TOTAL", bold: true, color: "FFFFFF", size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: COULEUR_NAVY },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: ligne.montant.toFixed(2), bold: true, color: "FFFFFF", size: 22 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          ...(ligne.avertissements.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 200 },
                  children: [new TextRun({ text: "Avertissements : " + ligne.avertissements.join(" "), color: "B45309", italics: true, size: 18 })],
                }),
              ]
            : []),

          // Zones de signature
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 150 },
            children: [new TextRun({ text: "Approbation", color: COULEUR_NAVY })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
            rows: [
              new TableRow({
                children: [celluleSignature("Le Professeur"), celluleSignature("Le Comptable")],
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `Document généré le ${new Date().toLocaleDateString("fr-FR")} — ${nomEtablissement} — à conserver par les deux parties après signature.`,
                size: 16,
                italics: true,
                color: "999999",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
