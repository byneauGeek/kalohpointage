-- AlterTable
ALTER TABLE "professeurs" ADD COLUMN     "matiereId" INTEGER;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
