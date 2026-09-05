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

// Euclidean distance on the RAW (non-L2-normalised) 128-d FaceRecognitionNet
// descriptor this app stores. Descriptor magnitudes are typically ~1.2-1.4,
// so same-person captures land roughly in the ~0.3-0.6 band and different
// people are usually >= ~0.7, but in a large enrolled population the lower
// tail of *different* faces overlaps the same-person range. A single lenient
// threshold on the population-wide duplicate scan therefore produces false
// "already registered" blocks. We split it into two tiers:
export const MATCH_THRESHOLD = 0.45; // euclidean distance; lower = stricter
//  - Below DUPLICATE_HARD_THRESHOLD the face is a near-certain match to an
//    existing enrolment: hard-block the new registration.
//  - Between DUPLICATE_HARD_THRESHOLD and DUPLICATE_REVIEW_THRESHOLD the face
//    is plausibly the same person OR a lookalike: don't block the voter, but
//    store a flag (with the distance + matched voter) for admin review.
export const DUPLICATE_HARD_THRESHOLD = 0.3;
export const DUPLICATE_REVIEW_THRESHOLD = 0.5;
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

/** Thrown when a presented face already belongs to another voter's account. */
export class DuplicateFaceError extends Error {
  match: FaceMatch | null;

  constructor(message: string, match?: FaceMatch | null) {
    super(message);
    this.name = "DuplicateFaceError";
    this.match = match ?? null;
  }
}

/** A candidate face found close to a presented descriptor. */
export interface FaceMatch {
  voterId: number;
  matNumber: string;
  name: string;
  distance: number;
}

export type DuplicateLevel = "none" | "review" | "hard";

/**
 * Scan all enrolled faces for the closest match to the presented descriptor.
 * Returns the confidence tier:
 *  - "hard":   distance <= DUPLICATE_HARD_THRESHOLD  -> treat as the same face
 *  - "review": inside the ambiguous band              -> flag for admin review
 *  - "none":   nothing close enough                   -> safe to enroll
 * `excludeVoterId` skips the voter's own template (re-enrollment).
 */
export async function evaluateDuplicate(
  descriptor: unknown,
  excludeVoterId?: number
): Promise<{ level: DuplicateLevel; match: FaceMatch | null }> {
  const presented = normalizeDescriptor(descriptor);
  if (!presented) return { level: "none", match: null };

  const candidates = await prisma.voter.findMany({
    where: {
      id: excludeVoterId ? { not: excludeVoterId } : undefined,
      faceEnrolled: true,
      faceTemplate: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      matNumber: true,
      faceTemplate: true,
      faceSalt: true,
    },
  });

  let best: FaceMatch | null = null;
  for (const c of candidates) {
    const enrolled =
      (c.faceSalt ? decryptDescriptor(c.faceTemplate ?? "", c.faceSalt) : null) ??
      normalizeDescriptor(c.faceTemplate);
    if (!enrolled) continue;
    const distance = euclidean(enrolled, presented);
    if (distance <= DUPLICATE_REVIEW_THRESHOLD && (!best || distance < best.distance)) {
      best = {
        voterId: c.id,
        matNumber: c.matNumber,
        name: `${c.firstName} ${c.lastName}`,
        distance,
      };
    }
  }
  if (!best) return { level: "none", match: null };
  const level: DuplicateLevel =
    best.distance <= DUPLICATE_HARD_THRESHOLD ? "hard" : "review";
  return { level, match: best };
}

/**
 * Convenience wrapper: search all enrolled faces for one matching the presented
 * descriptor. Returns the closest match at or below `MATCH_THRESHOLD`, or null.
 * Prefer `evaluateDuplicate` for the two-tier block/review policy.
 */
export async function findEnrolledMatch(
  descriptor: unknown,
  excludeVoterId?: number
): Promise<FaceMatch | null> {
  const presented = normalizeDescriptor(descriptor);
  if (!presented) return null;

  const candidates = await prisma.voter.findMany({
    where: {
      id: excludeVoterId ? { not: excludeVoterId } : undefined,
      faceEnrolled: true,
      faceTemplate: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      matNumber: true,
      faceTemplate: true,
      faceSalt: true,
    },
  });

  let best: FaceMatch | null = null;
  for (const c of candidates) {
    const enrolled =
      (c.faceSalt ? decryptDescriptor(c.faceTemplate ?? "", c.faceSalt) : null) ??
      normalizeDescriptor(c.faceTemplate);
    if (!enrolled) continue;
    const distance = euclidean(enrolled, presented);
    if (distance <= MATCH_THRESHOLD && (!best || distance < best.distance)) {
      best = {
        voterId: c.id,
        matNumber: c.matNumber,
        name: `${c.firstName} ${c.lastName}`,
        distance,
      };
    }
  }
  return best;
}

/**
 * Enroll (or re-enroll) a voter's face. Called only after the voter has proven
 * identity via the OTP, so the face bound here is trusted. Stores only the
 * encrypted template + a salted hash — never the raw descriptor.
 *
 * Duplicate policy: a face at or below `DUPLICATE_HARD_THRESHOLD` from another
 * voter's template throws `DuplicateFaceError` (near-certain same face). A face
 * inside the "review" band (between the hard threshold and
 * `DUPLICATE_REVIEW_THRESHOLD`) still enrolls, but the voter is flagged with
 * the matched voter + distance so an election officer can compare the faces.
 * Returns the enrolment status so callers can log/flag appropriately.
 */
export async function enrollFace(
  voterId: number,
  descriptor: unknown
): Promise<{ status: "enrolled" | "review"; match?: FaceMatch | null }> {
  const desc = normalizeDescriptor(descriptor);
  if (!desc) throw new Error("Invalid face descriptor");

  const existing = await prisma.voter.findUnique({ where: { id: voterId } });

  const dup = await evaluateDuplicate(desc, voterId);
  if (dup.level === "hard" && dup.match) {
    throw new DuplicateFaceError(
      "This face is already registered to another voter account.",
      dup.match
    );
  }

  const salt = existing?.faceSalt || randomSalt();
  const review = dup.level === "review" ? dup.match : null;

  await prisma.voter.update({
    where: { id: voterId },
    data: {
      faceTemplate: encryptDescriptor(desc, salt),
      faceSalt: salt,
      faceHash: hashDescriptor(desc, salt),
      faceEnrolled: true,
      faceRegisteredAt: new Date(),
      faceDuplicateOfId: review?.voterId ?? null,
      faceDuplicateDistance: review ? review.distance : null,
      faceDuplicateFlaggedAt: review ? new Date() : null,
      faceDuplicateReviewed: review ? false : true,
    },
  });
  return { status: review ? "review" : "enrolled", match: review };
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
