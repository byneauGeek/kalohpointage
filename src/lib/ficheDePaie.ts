/**
 * Fiche de paie (export Word) d'un professeur pour une periode : liste
 * chaque session validee avec sa matiere (un professeur peut enseigner
 * plusieurs matieres), les sous-totaux par matiere, puis le recapitulatif
 * de remuneration (identique au calcul de mdl_Comptabilisation).
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
  HeadingLevel,
  BorderStyle,
  Packer,
} from "docx";
import type { LigneComptabilisation, SessionDetail, DetailParMatiere } from "@/lib/comptabilisation";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

function celluleEntete(texte: string): TableCell {
  return new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    shading: { fill: "0B1B38" },
    children: [new Paragraph({ children: [new TextRun({ text: texte, bold: true, color: "FFFFFF", size: 18 })] })],
  });
}

function cellule(texte: string, gras = false): TableCell {
  return new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: texte, bold: gras, size: 20 })] })],
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

  const lignesSessions = sessions.map(
    (s) =>
      new TableRow({
        children: [
          cellule(s.date.toISOString().slice(0, 10)),
          cellule(JOURS[s.date.getUTCDay() === 0 ? 7 : s.date.getUTCDay()]),
          cellule(s.matiere),
          cellule(s.classe),
          cellule(formatHeures(s.dureeValideeMin)),
        ],
      })
  );

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: nomEtablissement, bold: true, size: 32, color: "0B1B38" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: "Fiche de paie — Enseignement", size: 22, color: "A9790A", italics: true })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: `${ligne.nom} ${ligne.prenom}` })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Matricule : ${ligne.matricule}    ` }),
              new TextRun({ text: `Statut : ${ligne.statut}    ` }),
              new TextRun({ text: `Période : ${periodeLibelle}` }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: "Détail des sessions effectuées" })],
          }),
          sessions.length > 0
            ? new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
                  bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
                  left: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
                  right: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E5E5" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E5E5" },
                },
                rows: [
                  new TableRow({
                    children: [
                      celluleEntete("Date"),
                      celluleEntete("Jour"),
                      celluleEntete("Matière"),
                      celluleEntete("Classe"),
                      celluleEntete("Durée"),
                    ],
                  }),
                  ...lignesSessions,
                ],
              })
            : new Paragraph({ children: [new TextRun({ text: "Aucune session validée sur cette période.", italics: true })] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Sous-totaux par matière" })],
          }),
          ...parMatiere.map(
            (m) =>
              new Paragraph({
                children: [new TextRun({ text: `${m.matiere} : ${formatHeures(m.minutes)}` })],
              })
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Récapitulatif de rémunération" })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Heures validées totales : ${formatHeures(ligne.minutesValidees)}` })] }),
          ...(ligne.quotaMin != null
            ? [
                new Paragraph({ children: [new TextRun({ text: `Quota mensuel : ${formatHeures(ligne.quotaMin)}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Heures supplémentaires : ${formatHeures(ligne.minutesSupp)}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Salaire fixe : ${ligne.salaireFixe.toFixed(2)}` })] }),
              ]
            : [new Paragraph({ children: [new TextRun({ text: `Taux horaire appliqué : ${ligne.tauxApplique.toFixed(2)}` })] })]),
          new Paragraph({
            spacing: { before: 150 },
            children: [new TextRun({ text: `Montant total : ${ligne.montant.toFixed(2)}`, bold: true, size: 26 })],
          }),

          ...(ligne.avertissements.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 200 },
                  children: [new TextRun({ text: "Avertissements : " + ligne.avertissements.join(" "), color: "B45309", italics: true, size: 18 })],
                }),
              ]
            : []),

          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({ text: `Document généré le ${new Date().toLocaleDateString("fr-FR")} — ${nomEtablissement}`, size: 16, italics: true, color: "999999" }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
