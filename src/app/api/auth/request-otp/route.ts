import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const matNumber = String(body.matNumber || "").trim();
  if (!matNumber) {
    return NextResponse.json({ error: "Matriculation number is required." }, { status: 400 });
  }

  const voter = await prisma.voter.findUnique({ where: { matNumber } });
  if (!voter) {
    return NextResponse.json(
      { error: "No voter found with that matriculation number. Please register first." },
      { status: 404 }
    );
  }

  const { emailSent, code, emailError, throttled } = await issueOtp(
    voter.id,
    voter.email,
    voter.firstName
  );

  if (throttled) {
    return NextResponse.json(
      { error: emailError || "Please wait before requesting a new code." },
      { status: 429 }
    );
  }

  return NextResponse.json({
    ok: true,
    matNumber: voter.matNumber,
    email: voter.email,
    emailSent,
    devOtp: emailSent ? undefined : code,
  });
}
