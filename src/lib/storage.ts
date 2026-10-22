/**
 * Stockage objet S3-compatible (Neon Object Storage) : conserve le fichier
 * Excel ORIGINAL de chaque import d'emploi du temps, pour tracabilite -
 * meme principe que le journal des imports (T_ImportsLog) : pouvoir
 * reconsulter exactement ce qui a ete transmis, pas seulement le compte
 * rendu. N'echoue jamais l'import si le stockage est indisponible : c'est
 * un complement de tracabilite, pas une donnee metier indispensable.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.STORAGE_BUCKET ?? "uploads";

function client(): S3Client | null {
  if (!process.env.STORAGE_ENDPOINT || !process.env.STORAGE_ACCESS_KEY_ID || !process.env.STORAGE_SECRET_ACCESS_KEY) {
    return null;
  }
  return new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION ?? "us-east-2",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
}

/** Televerse le fichier Excel d'un import ; retourne la cle objet ou null
 * si le stockage n'est pas configure/disponible (ne bloque jamais l'import). */
export async function stockerFichierImport(buffer: Buffer, importLogId: number, nomFichier: string): Promise<string | null> {
  const s3 = client();
  if (!s3) return null;
  const cle = `imports-emploi-du-temps/${importLogId}-${nomFichier}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: cle,
        Body: buffer,
        ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    return cle;
  } catch {
    return null;
  }
}

/** URL signee temporaire (10 min) pour retelecharger le fichier original. */
export async function urlSigneeFichierImport(cle: string): Promise<string | null> {
  const s3 = client();
  if (!s3) return null;
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: cle }), { expiresIn: 600 });
  } catch {
    return null;
  }
}
