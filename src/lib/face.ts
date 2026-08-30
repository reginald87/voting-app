import { prisma } from "./prisma";
import { getSiteContent } from "./content";
import {
  normalizeDescriptor,
  encryptDescriptor,
  decryptDescriptor,
  hashDescriptor,
  randomSalt,
  DESCRIPTOR_LENGTH,
} from "./biometric";

/**
 * Face verification (face-api.js client-side descriptors).
 *
 * The client computes a 128-d descriptor and sends it to the server. We store
 * the template ENCRYPTED at rest (AES-256-GCM + per-voter salt) and verify by
 * decrypting it in memory just long enough to compute the euclidean distance.
 * A salted hash is kept for audit. This is a layered verification factor on
 * top of the OTP — not a replacement.
 */

export const MATCH_THRESHOLD = 0.45; // euclidean distance; lower = stricter
export { DESCRIPTOR_LENGTH };

export async function faceEnabled(): Promise<boolean> {
  const c = await getSiteContent();
  return Boolean(c.faceRecognition);
}

/** Whether a voter has an enrolled, decryptable face template on file. */
export async function hasEnrolledFace(voterId: number): Promise<boolean> {
  const v = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!v?.faceEnrolled || !v.faceTemplate) return false;
  if (!v.faceSalt) return false; // placeholder / legacy row without crypto salt
  return true;
}

/**
 * Enroll (or re-enroll) a voter's face. Called only after the voter has proven
 * identity via the OTP, so the face bound here is trusted. Stores only the
 * encrypted template + a salted hash — never the raw descriptor.
 */
export async function enrollFace(voterId: number, descriptor: unknown) {
  const desc = normalizeDescriptor(descriptor);
  if (!desc) throw new Error("Invalid face descriptor");

  const existing = await prisma.voter.findUnique({ where: { id: voterId } });
  const salt = existing?.faceSalt || randomSalt();

  await prisma.voter.update({
    where: { id: voterId },
    data: {
      faceTemplate: encryptDescriptor(desc, salt),
      faceSalt: salt,
      faceHash: hashDescriptor(desc, salt),
      faceEnrolled: true,
      faceRegisteredAt: new Date(),
    },
  });
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

async function enrolledDescriptor(voterId: number): Promise<number[] | null> {
  const voter = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!voter || !voter.faceEnrolled || !voter.faceTemplate) return null;

  if (voter.faceSalt) {
    const dec = decryptDescriptor(voter.faceTemplate, voter.faceSalt);
    if (dec) return dec;
  }
  // Backwards compatibility: templates stored as raw JSON before encryption.
  return normalizeDescriptor(voter.faceTemplate);
}

export async function matchFace(
  voterId: number,
  descriptor: unknown
): Promise<{ ok: boolean; reason?: string }> {
  const enrolled = await enrolledDescriptor(voterId);
  if (!enrolled) {
    return {
      ok: false,
      reason: "No face is registered for this voter. Please enroll your face first.",
    };
  }
  const presented = normalizeDescriptor(descriptor);
  if (!presented) {
    return { ok: false, reason: "Face template could not be read." };
  }
  const distance = euclidean(enrolled, presented);
  if (distance <= MATCH_THRESHOLD) return { ok: true, reason: undefined };
  return {
    ok: false,
    reason: `Face did not match the registered template (distance ${distance.toFixed(3)}).`,
  };
}
