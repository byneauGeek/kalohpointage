/**
 * Fiche de paie (export PDF) - meme contenu que genererFicheDePaieDocx
 * (src/lib/ficheDePaie.ts), pour l'administration qui prefere un PDF a un
 * document Word modifiable.
 */
import PDFDocument from "pdfkit";
import type { LigneComptabilisation, SessionDetail, DetailParMatiere } from "@/lib/comptabilisation";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const NAVY = "#0B1B38";
const GOLD = "#A9790A";
const GRIS = "#6B7280";

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

export async function genererFicheDePaiePdf(params: {
  nomEtablissement: string;
  periodeLibelle: string;
  ligne: LigneComptabilisation;
  sessions: SessionDetail[];
  parMatiere: DetailParMatiere[];
}): Promise<Buffer> {
  const { nomEtablissement, periodeLibelle, ligne, sessions, parMatiere } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor(NAVY).font("Helvetica-Bold").text(nomEtablissement, { align: "center" });
    doc.fontSize(11).fillColor(GOLD).font("Helvetica-Oblique").text("Fiche de paie — Enseignement", { align: "center" });
    doc.moveDown(1.2);

    doc.fontSize(14).fillColor(NAVY).font("Helvetica-Bold").text(`${ligne.nom} ${ligne.prenom}`);
    doc.fontSize(10).fillColor("#000000").font("Helvetica")
      .text(`Matricule : ${ligne.matricule}    Statut : ${ligne.statut}    Période : ${periodeLibelle}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Détail des sessions effectuées");
    doc.moveDown(0.3);

    if (sessions.length === 0) {
      doc.fontSize(10).font("Helvetica-Oblique").fillColor(GRIS).text("Aucune session validée sur cette période.");
    } else {
      const colonnes = [
        { titre: "Date", largeur: 70 },
        { titre: "Jour", largeur: 70 },
        { titre: "Matière", largeur: 120 },
        { titre: "Classe", largeur: 100 },
        { titre: "Durée", largeur: 70 },
      ];
      const xDepart = doc.x;
      let y = doc.y;

      function ligneTableau(valeurs: string[], gras: boolean, fond?: string) {
        const hauteur = 18;
        if (fond) doc.rect(xDepart, y, colonnes.reduce((s, c) => s + c.largeur, 0), hauteur).fill(fond);
        doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(gras ? "#FFFFFF" : "#000000");
        let x = xDepart;
        valeurs.forEach((v, i) => {
          doc.text(v, x + 4, y + 5, { width: colonnes[i].largeur - 8, lineBreak: false });
          x += colonnes[i].largeur;
        });
        y += hauteur;
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
      }

      ligneTableau(colonnes.map((c) => c.titre), true, NAVY);
      for (const s of sessions) {
        const jourTexte = JOURS[s.date.getUTCDay() === 0 ? 7 : s.date.getUTCDay()];
        ligneTableau([s.date.toISOString().slice(0, 10), jourTexte, s.matiere, s.classe, formatHeures(s.dureeValideeMin)], false);
      }
      doc.y = y + 10;
    }

    doc.moveDown(0.8);
    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Sous-totaux par matière");
    doc.moveDown(0.2);
    doc.fontSize(10).font("Helvetica").fillColor("#000000");
    for (const m of parMatiere) {
      doc.text(`${m.matiere} : ${formatHeures(m.minutes)}`);
    }

    doc.moveDown(0.8);
    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Récapitulatif de rémunération");
    doc.moveDown(0.2);
    doc.fontSize(10).font("Helvetica").fillColor("#000000");
    doc.text(`Heures validées totales : ${formatHeures(ligne.minutesValidees)}`);
    if (ligne.quotaMin != null) {
      doc.text(`Quota mensuel : ${formatHeures(ligne.quotaMin)}`);
      doc.text(`Heures supplémentaires : ${formatHeures(ligne.minutesSupp)}`);
      doc.text(`Salaire fixe : ${ligne.salaireFixe.toFixed(2)}`);
    } else {
      doc.text(`Taux horaire appliqué : ${ligne.tauxApplique.toFixed(2)}`);
    }
    doc.moveDown(0.3);
    doc.fontSize(14).font("Helvetica-Bold").text(`Montant total : ${ligne.montant.toFixed(2)}`);

    if (ligne.avertissements.length > 0) {
      doc.moveDown(0.6);
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#B45309").text("Avertissements : " + ligne.avertissements.join(" "));
    }

    doc.moveDown(1.5);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(GRIS)
      .text(`Document généré le ${new Date().toLocaleDateString("fr-FR")} — ${nomEtablissement}`);

    doc.end();
  });
}
