import { createTransport, type Transporter } from "nodemailer";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

// Transient SMTP error codes that are safe to retry.
const RETRYABLE_CODES = new Set([421, 450, 451, 452, 550, 551, 554]);

interface Provider {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

function readProvider(index: number): Provider | null {
  const suffix = index === 0 ? "" : String(index + 1);
  const host = process.env[`SMTP_HOST${suffix}`];
  if (!host) return null;
  const port = Number(process.env[`SMTP_PORT${suffix}`] || 465);
  return {
    host,
    port,
    secure: port === 465,
    user: process.env[`SMTP_USER${suffix}`],
    pass: process.env[`SMTP_PASS${suffix}`],
    from:
      process.env[`SMTP_FROM${suffix}`] ||
      "BMU SUG Elections <no-reply@bmu-sug.edu.ng>",
  };
}

function buildTransporter(provider: Provider): Transporter {
  return createTransport({
    host: provider.host,
    port: provider.port,
    secure: provider.secure,
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    auth: provider.user && provider.pass ? { user: provider.user, pass: provider.pass } : undefined,
  });
}

function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const codeMatch = msg.match(/\b(\d{3})\b/);
  if (codeMatch) {
    const code = Number(codeMatch[1]);
    if (RETRYABLE_CODES.has(code)) return true;
    // 4xx are usually transient / rate limit; 5xx are usually permanent.
    return code >= 400 && code < 500;
  }
  const lower = msg.toLowerCase();
  return (
    lower.includes("econn") ||
    lower.includes("etimedout") ||
    lower.includes("eai_again") ||
    lower.includes("socket") ||
    lower.includes("greeting")
  );
}

export interface MailResult {
  sent: boolean;
  error?: string;
  provider?: string;
  attempts?: number;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<MailResult> {
  // Try primary provider then any configured fallbacks.
  for (let idx = 0; idx < 4; idx++) {
    const provider = readProvider(idx);
    if (!provider) break;

    let transporter: Transporter | null = null;
    try {
      transporter = buildTransporter(provider);
    } catch (err) {
      console.error("[mailer] failed to create transporter:", err);
      continue;
    }

    let lastErr: string | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await transporter.sendMail({
          from: provider.from,
          to,
          subject,
          html,
        });
        return { sent: true, provider: provider.host, attempts: attempt };
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        const code = (err as any)?.code || "";
        console.error(
          `[mailer] provider ${provider.host} attempt ${attempt} failed: ${lastErr}${code ? ` (${code})` : ""}`
        );
        // Don't retry on permanent auth / invalid-recipient errors.
        if (/535|534|533|501|510|550 .*no such user|454/.test(String(lastErr))) break;
        if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
          await delay(RETRY_DELAY_MS * attempt);
        } else {
          break;
        }
      }
    }

    // If this provider failed, fall through to the next configured provider.
    transporter.close();
    if (!lastErr) lastErr = "unknown error";
  }

  return { sent: false, error: "All SMTP providers failed" };
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
