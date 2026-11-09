-- DropIndex
DROP INDEX "cours_professeurId_dateCours_heureDebutPrevueMin_classeId_key";

-- AlterTable
ALTER TABLE "matieres" ADD COLUMN     "modeComptageSimultane" TEXT NOT NULL DEFAULT 'PAR_CLASSE';

-- CreateIndex
CREATE UNIQUE INDEX "cours_professeurId_dateCours_heureDebutPrevueMin_classeId_m_key" ON "cours"("professeurId", "dateCours", "heureDebutPrevueMin", "classeId", "matiereId");
