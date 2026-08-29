"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { enrollFace, faceEnabled } from "@/lib/face";
import { getRegistrationStatus } from "@/lib/election";
import { LEVELS, isValidMatNumber } from "@/lib/constants";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

function extFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "application/pdf") return ".pdf";
  return "";
}

export async function registerAction(formData: FormData) {
  const get = (k: string) => String(formData.get(k) || "").trim();

  const matNumber = get("matNumber");
  const email = get("email").toLowerCase();
  const firstName = get("firstName");
  const lastName = get("lastName");
  const department = get("department");
  const level = get("level");
  const sugReceipt = get("sugReceipt");

  if (!matNumber || !email || !firstName || !lastName || !sugReceipt) {
    return { error: "All fields are required, including the SUG receipt." };
  }
  if (!isValidMatNumber(matNumber)) {
    return { error: "Invalid matriculation number. Use the format UG/00/0000 (e.g. UG/23/0045)." };
  }
  if (!department) {
    return { error: "Department is required." };
  }
  if (!LEVELS.includes(level)) {
    return { error: "Invalid level." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Invalid email address." };
  }

  const regStatus = await getRegistrationStatus();
  if (!regStatus.open) {
    return { error: regStatus.reason || "Voter registration is currently closed." };
  }

  let faceTemplate: unknown = undefined;
  const rawFace = formData.get("faceTemplate");
  if (rawFace && typeof rawFace === "string") {
    try {
      faceTemplate = JSON.parse(rawFace);
    } catch {
      faceTemplate = undefined;
    }
  }

  const file = formData.get("receipt");
  let sugReceiptUrl: string | null = null;
  if (file instanceof File) {
    if (!ALLOWED.includes(file.type)) {
      return { error: "Receipt must be a PNG, JPG, WEBP image or PDF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return { error: "Receipt file is too large (max 5MB)." };
    }
    const ext = extFor(file.type);
    const name = `${randomUUID()}${ext}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buf);
    sugReceiptUrl = `/uploads/${name}`;
  } else {
    return { error: "Please upload your SUG dues receipt." };
  }

  const conflict = await prisma.voter.findFirst({
    where: { OR: [{ matNumber }, { email }, { sugReceipt }] },
  });
  if (conflict) {
    let message = "An account with these details already exists.";
    if (conflict.email === email) {
      message = "An account with this email address already exists. If this is you, please sign in or use the OTP login instead.";
    } else if (conflict.matNumber === matNumber) {
      message = "An account with this matriculation number already exists. Each student can only register once.";
    } else if (conflict.sugReceipt === sugReceipt) {
      message = "This SUG receipt number has already been used to register an account.";
    }
    return { error: message };
  }

  const faceOn = await faceEnabled();
  if (faceOn && !faceTemplate) {
    return { error: "Face enrollment is required. Please capture your face to continue." };
  }

  const voter = await prisma.voter.create({
    data: {
      matNumber,
      email,
      firstName,
      lastName,
      department,
      level,
      sugReceipt,
      sugReceiptUrl,
    },
  });

  const { emailSent, code, emailError, throttled } = await issueOtp(
    voter.id,
    voter.email,
    `${voter.firstName}`
  );

  if (throttled) {
    return { error: emailError || "Please wait before requesting a new code." };
  }

  if (faceOn && faceTemplate) {
    try {
      await enrollFace(voter.id, faceTemplate);
    } catch (err) {
      console.error("[registerAction] face enrollment failed:", err);
    }
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (!emailSent) {
    // Never reveal the OTP to the client in production. Surface a generic
    // error instead so an attacker cannot read the code off the screen.
    if (isProduction) {
      console.error(
        "[registerAction] email delivery failed for", voter.matNumber, ":", emailError
      );
      return {
        error:
          "Your account was created, but we could not deliver your verification code by email. Please try signing in again shortly.",
      };
    }
  }

  return {
    ok: true as const,
    matNumber: voter.matNumber,
    email: voter.email,
    emailSent,
    // Dev convenience only: expose the code on screen when SMTP is unset.
    // Must never be surfaced in production.
    devOtp: !isProduction && !emailSent ? code : undefined,
  };
}
