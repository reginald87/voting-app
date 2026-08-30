import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Biometric template protection (industry-standard at-rest handling).
 *
 * A 128-d face descriptor is processed by face-api.js in the browser and sent
 * to the server. The stored "template" is NOT the raw descriptor, which would
 * be reversible biometric data if the DB leaked. Instead:
 *
 *  - We ENCRYPT the comparable template at rest with AES-256-GCM, keyed by a
 *    server secret + a per-voter random salt. Verification decrypts it just
 *    long enough to compute the match distance; at rest it is ciphertext.
 *  - We store a salted SHA-256 HASH of the descriptor for tamper-evidence and
 *    audit, so audit rows (sessions/votes) never hold reversible raw vectors.
 *
 * Summary: comparable template -> encrypted at rest; audit proofs -> hashed.
 */

export const DESCRIPTOR_LENGTH = 128;

export function normalizeDescriptor(d: unknown): number[] | null {
  // Accept a parsed array or a JSON-encoded string (clients send a stringified
  // descriptor array; some routes forward the raw string).
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

function biometricKey(): Buffer {
  const secret =
    process.env.BIOMETRIC_KEY ||
    process.env.SESSION_SECRET ||
    "dev-biometric-key-change-me";
  return createHash("sha256").update(secret).digest();
}

export function randomSalt(): string {
  return randomBytes(16).toString("hex");
}

function deriveKey(salt: string): Buffer {
  return createHash("sha256")
    .update(biometricKey().toString("hex"))
    .update("::")
    .update(salt)
    .digest();
}

/** Encrypt a normalized descriptor into a self-contained ciphertext payload. */
export function encryptDescriptor(desc: number[], salt: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(salt), iv);
  const plain = Buffer.from(JSON.stringify(desc), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${Buffer.concat([tag, enc]).toString("hex")}`;
}

/** Decrypt an encrypted template back into a normalized descriptor (or null). */
export function decryptDescriptor(
  payload: string,
  salt: string
): number[] | null {
  try {
    const dot = payload.indexOf(".");
    if (dot === -1) return null;
    const iv = Buffer.from(payload.slice(0, dot), "hex");
    const body = Buffer.from(payload.slice(dot + 1), "hex");
    const tag = body.subarray(0, 16);
    const enc = body.subarray(16);
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(salt), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return normalizeDescriptor(JSON.parse(plain.toString("utf8")));
  } catch {
    return null;
  }
}

/** Salted SHA-256 hash used for audit/tamper-evidence (never reversible). */
export function hashDescriptor(desc: number[], salt: string): string {
  return createHash("sha256")
    .update(salt)
    .update("::")
    .update(JSON.stringify(desc))
    .digest("hex");
}

/**
 * Hash of a raw (possibly stringified or array) descriptor, using the server
 * biometric key as a fixed salt. Used for audit proofs on sessions/votes so the
 * DB never stores a reusable raw vector. Returns null if the descriptor is
 * malformed.
 */
export function proofHashFromRaw(raw: unknown): string | null {
  const desc = normalizeDescriptor(raw);
  if (!desc) return null;
  return createHash("sha256")
    .update(biometricKey().toString("hex"))
    .update("::")
    .update(JSON.stringify(desc))
    .digest("hex");
}
