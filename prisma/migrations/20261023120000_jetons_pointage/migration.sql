-- CreateTable
CREATE TABLE "jetons_pointage" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "genereLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "genereParId" INTEGER NOT NULL,

    CONSTRAINT "jetons_pointage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "jetons_pointage" ADD CONSTRAINT "jetons_pointage_genereParId_fkey" FOREIGN KEY ("genereParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
