import { createTransport, type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let cachedConfigured: boolean | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (cachedConfigured !== false) {
      // eslint-disable-next-line no-console
      console.warn(
        "[mailer] SMTP_HOST is not set. Emails will NOT be sent. OTPs will only be shown in the dev OTP view (/dev/otp) and server logs."
      );
      cachedConfigured = false;
    }
    return null;
  }
  if (!transporter) {
    transporter = createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export interface MailResult {
  sent: boolean;
  error?: string;
}

export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<MailResult> {
  const t = getTransporter();
  if (!t) {
    return { sent: false, error: "SMTP not configured" };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || "BMU SUG Elections <no-reply@bmu-sug.edu.ng>",
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[mailer] failed to send mail:", error);
    return { sent: false, error };
  }
}

export function otpHtml(otp: string, name: string): string {
  return `
  <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:auto;background:#f8fafc;padding:24px;border-radius:12px">
    <h2 style="color:#1f59e0">BMU SUG Elections</h2>
    <p>Hello ${name},</p>
    <p>Your one-time verification code is:</p>
    <div style="font-size:32px;letter-spacing:6px;font-weight:700;color:#0f172a;background:#eef6ff;padding:16px;text-align:center;border-radius:10px">${otp}</div>
    <p style="color:#475569">This code expires in 10 minutes. If you did not request this, you can ignore the message.</p>
  </div>`;
}
