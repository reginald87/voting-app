import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { enrollFace, faceEnabled } from "@/lib/face";
import { getRegistrationStatus } from "@/lib/election";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

function extFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "application/pdf") return ".pdf";
  return "";
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let f: any;
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const get = (k: string) => String(fd.get(k) || "").trim();
    let faceTemplate: unknown = undefined;
    const rawFace = fd.get("faceTemplate");
    if (rawFace && typeof rawFace === "string") {
      try {
        faceTemplate = JSON.parse(rawFace);
      } catch {
        faceTemplate = undefined;
      }
    }
    f = {
      matNumber: get("matNumber"),
      email: get("email"),
      firstName: get("firstName"),
      lastName: get("lastName"),
      department: get("department"),
      level: get("level"),
      sugReceipt: get("sugReceipt"),
      receipt: fd.get("receipt"),
      faceTemplate,
    };
  } else {
    f = await req.json().catch(() => ({}));
  }

  const matNumber = String(f.matNumber || "").trim();
  const email = String(f.email || "").trim().toLowerCase();
  const firstName = String(f.firstName || "").trim();
  const lastName = String(f.lastName || "").trim();
  const department = String(f.department || "").trim();
  const level = String(f.level || "").trim();
  const sugReceipt = String(f.sugReceipt || "").trim();

  if (!matNumber || !email || !firstName || !lastName || !sugReceipt) {
    return NextResponse.json(
      { error: "All fields are required, including the SUG receipt." },
      { status: 400 }
    );
  }
  if (!DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: "Invalid department." }, { status: 400 });
  }
  if (!LEVELS.includes(level)) {
    return NextResponse.json({ error: "Invalid level." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const regStatus = await getRegistrationStatus();
  if (!regStatus.open) {
    return NextResponse.json(
      {
        error:
          regStatus.reason ||
          "Voter registration is currently closed.",
      },
      { status: 403 }
    );
  }

  const file = f.receipt;
  let sugReceiptUrl: string | null = null;
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Receipt must be a PNG, JPG, WEBP image or PDF." },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Receipt file is too large (max 5MB)." }, { status: 400 });
    }
    const ext = extFor(file.type);
    const name = `${randomUUID()}${ext}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buf);
    sugReceiptUrl = `/uploads/${name}`;
  } else {
    return NextResponse.json(
      { error: "Please upload your SUG dues receipt." },
      { status: 400 }
    );
  }

  const conflict = await prisma.voter.findFirst({
    where: { OR: [{ matNumber }, { email }, { sugReceipt }] },
  });
  if (conflict) {
    let message =
      "An account with these details already exists.";
    if (conflict.email === email) {
      message = "An account with this email address already exists. If this is you, please sign in or use the OTP login instead.";
    } else if (conflict.matNumber === matNumber) {
      message = "An account with this matriculation number already exists. Each student can only register once.";
    } else if (conflict.sugReceipt === sugReceipt) {
      message = "This SUG receipt number has already been used to register an account.";
    }
    return NextResponse.json({ error: message }, { status: 409 });
  }

  // If face recognition is enabled site-wide, a captured face template is
  // mandatory at registration.
  const faceOn = await faceEnabled();
  if (faceOn && !f.faceTemplate) {
    return NextResponse.json(
      { error: "Face enrollment is required. Please capture your face to continue." },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: emailError || "Please wait before requesting a new code." },
      { status: 429 }
    );
  }

  if ((await faceEnabled()) && f.faceTemplate) {
    try {
      await enrollFace(voter.id, f.faceTemplate);
    } catch {
      // Ignore invalid descriptor; voter can enroll face later if needed.
    }
  }

  return NextResponse.json({
    ok: true,
    matNumber: voter.matNumber,
    email: voter.email,
    emailSent,
    devOtp: emailSent ? undefined : code,
  });
}
