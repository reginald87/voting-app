import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { sendMail, otpHtml } from "./mailer";

const OTP_TTL_MS = 1000 * 60 * 5; // 5 minutes
const OTP_RESEND_MS = 1000 * 30; // throttle: max one code per 30s

export function makeOtp(): string {
  return String(randomInt(100000, 999999));
}

export async function issueOtp(voterId: number, email: string, name: string) {
  const recent = await prisma.otp.findFirst({
    where: { voterId },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const since = Date.now() - recent.createdAt.getTime();
    if (since < OTP_RESEND_MS) {
      return {
        code: null,
        emailSent: false,
        emailError: `Please wait ${Math.ceil(
          (OTP_RESEND_MS - since) / 1000
        )}s before requesting a new code.`,
        throttled: true,
      } as const;
    }
  }

  const code = makeOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otp.updateMany({
    where: { voterId, used: false },
    data: { used: true },
  });

  await prisma.otp.create({
    data: { voterId, code, expiresAt },
  });

  const res = await sendMail(
    email,
    "Your BMU SUG Elections Verification Code",
    otpHtml(code, name)
  );

  return {
    code,
    emailSent: res.sent,
    emailError: res.error,
    throttled: false,
  } as const;
}

export async function verifyOtp(
  voterId: number,
  code: string
): Promise<{ ok: boolean; reason?: string }> {
  const otp = await prisma.otp.findFirst({
    where: { voterId, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false, reason: "No active code. Request a new one." };
  if (otp.code !== code) return { ok: false, reason: "Incorrect verification code." };
  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "Code has expired. Request a new one." };
  }

  await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
  return { ok: true };
}
