/**
 * Jeu de donnees de DEMONSTRATION uniquement (pas le seed de production) :
 * un professeur avec PIN et un cours planifie aujourd'hui, pour pouvoir
 * tester l'ecran de pointage immediatement.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const prisma = new PrismaClient();

async function hash(secret: string) {
  const sel = randomBytes(16).toString("hex");
  const derived = (await scrypt(secret, sel, 64)) as Buffer;
  return { hash: derived.toString("hex"), sel };
}

async function main() {
  const classe = await prisma.classe.upsert({
    where: { nomClasse: "6e1" },
    create: { nomClasse: "6e1", niveau: "6eme" },
    update: {},
  });
  const matiere = await prisma.matiere.upsert({
    where: { libelle: "Mathematiques" },
    create: { libelle: "Mathematiques" },
    update: {},
  });
  const professeur = await prisma.professeur.upsert({
    where: { matricule: "DEMO-001" },
    create: { matricule: "DEMO-001", nom: "Dupont", prenom: "Jean", statut: "VACATAIRE" },
    update: {},
  });

  const { hash: h, sel } = await hash("1234");
  await prisma.utilisateur.upsert({
    where: { professeurId: professeur.id },
    create: { role: "PROFESSEUR", professeurId: professeur.id, codePinHash: h, codePinSel: sel },
    update: { codePinHash: h, codePinSel: sel, actif: true },
  });

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const minutesMaintenant = now.getUTCHours() * 60 + now.getUTCMinutes();

  await prisma.cours.deleteMany({ where: { professeurId: professeur.id, dateCours: today } });
  await prisma.cours.create({
    data: {
      professeurId: professeur.id,
      classeId: classe.id,
      matiereId: matiere.id,
      dateCours: today,
      heureDebutPrevueMin: Math.max(0, minutesMaintenant - 5),
      heureFinPrevueMin: minutesMaintenant + 55,
      dureePrevueMin: 60,
      statut: "PLANIFIE",
    },
  });

  console.log("Professeur demo : Jean Dupont, PIN 1234, cours planifie aujourd'hui.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
