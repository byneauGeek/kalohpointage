/**
 * Hachage des mots de passe et codes PIN. Contrairement a la version Access
 * (qui a du contourner un bug CryptoAPI/CNG local via un sous-processus
 * PowerShell, voir Journal_Decisions.md D23/D24), Node fournit `crypto.scrypt`
 * nativement : aucun contournement necessaire ici.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const KEYLEN = 64;

export async function hashSecret(secret: string): Promise<{ hash: string; sel: string }> {
  const sel = randomBytes(16).toString("hex");
  const derived = (await scrypt(secret, sel, KEYLEN)) as Buffer;
  return { hash: derived.toString("hex"), sel };
}

export async function verifySecret(secret: string, hash: string, sel: string): Promise<boolean> {
  const derived = (await scrypt(secret, sel, KEYLEN)) as Buffer;
  const attendu = Buffer.from(hash, "hex");
  if (derived.length !== attendu.length) return false;
  return timingSafeEqual(derived, attendu);
}

export function sha256Hex(texte: string): string {
  const { createHash } = require("crypto");
  return createHash("sha256").update(texte, "utf8").digest("hex");
}

export function genererCodeVerification(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caracteres ambigus (0/O, 1/I...)
  const groupe = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `VFY-${groupe()}-${groupe()}`;
}
