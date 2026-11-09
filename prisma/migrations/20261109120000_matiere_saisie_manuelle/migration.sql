-- AlterTable
ALTER TABLE "saisies_heures_manuelles" ADD COLUMN     "matiereId" INTEGER;

-- AddForeignKey
ALTER TABLE "saisies_heures_manuelles" ADD CONSTRAINT "saisies_heures_manuelles_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
