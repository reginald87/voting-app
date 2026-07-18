import { prisma } from "./prisma";
import { getSiteContent } from "./content";

/**
 * Real face recognition (face-api.js, client-side descriptors).
 *
 * The client computes a 128-d descriptor with face-api.js and sends the raw
 * number[] to the server. We store it as a JSON string and compare with
 * euclidean distance. This is a SECOND FACTOR alongside the OTP — not a
 * replacement. Biometric handling requires a consent notice (see registration).
 */

export const DESCRIPTOR_LENGTH = 128;
export const MATCH_THRESHOLD = 0.45; // euclidean distance; lower = stricter

export async function faceEnabled(): Promise<boolean> {
  const c = await getSiteContent();
  return Boolean(c.faceRecognition);
}

function normalize(d: unknown): number[] | null {
  // Accept a parsed array or a JSON-encoded string (the client sends a
  // stringified descriptor, and verify-otp forwards the raw string).
  let value: unknown = d;
  if (typeof d === "string") {
    try {
      value = JSON.parse(d);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value)) return null;
  if (value.length !== DESCRIPTOR_LENGTH) return null;
  const nums = value.map((n) => Number(n));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

export async function enrollFace(voterId: number, descriptor: unknown) {
  const desc = normalize(descriptor);
  if (!desc) throw new Error("Invalid face descriptor");
  await prisma.voter.update({
    where: { id: voterId },
    data: { faceTemplate: JSON.stringify(desc), faceEnrolled: true },
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

export async function matchFace(
  voterId: number,
  descriptor: unknown
): Promise<{ ok: boolean; reason?: string }> {
  const voter = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!voter || !voter.faceEnrolled || !voter.faceTemplate) {
    return { ok: false, reason: "Face not enrolled for this voter." };
  }
  const enrolled = normalize(JSON.parse(voter.faceTemplate));
  const presented = normalize(descriptor);
  if (!enrolled || !presented) {
    return { ok: false, reason: "Face template could not be read." };
  }
  const distance = euclidean(enrolled, presented);
  if (distance <= MATCH_THRESHOLD) return { ok: true, reason: undefined };
  return {
    ok: false,
    reason: `Face did not match the enrolled template (distance ${distance.toFixed(3)}).`,
  };
}
