-- DropIndex
DROP INDEX "cours_professeurId_dateCours_heureDebutPrevueMin_key";

-- CreateIndex
CREATE UNIQUE INDEX "cours_professeurId_dateCours_heureDebutPrevueMin_classeId_key" ON "cours"("professeurId", "dateCours", "heureDebutPrevueMin", "classeId");
