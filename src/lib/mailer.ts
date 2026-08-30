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
    // App passwords are frequently stored/displayed with spaces (Gmail's 4x4
    // format). Gmail's SMTP auth requires the contiguous 16-char form, so strip
    // all whitespace before passing to the server.
    pass: process.env[`SMTP_PASS${suffix}`]?.replace(/\s+/g, ""),
    from:
      process.env[`SMTP_FROM${suffix}`] ||
      "BMU SUG Elections <no-reply@bmu-sug.edu.ng>",
  };
}

// Providers are cycled round-robin so no single provider bears the whole day's
// load. Gmail-style app passwords are rate-limited; spreading messages keeps
// each provider under its throttle and reduces "some users fail" bursts.
let rrCounter = 0;
function nextStart(providerCount: number): number {
  rrCounter = (rrCounter + 1) % providerCount;
  return rrCounter;
}

function collectProviders(providerCount: number): Provider[] {
  const providers: Provider[] = [];
  for (let i = 0; i < providerCount; i++) {
    const p = readProvider(i);
    if (p) providers.push(p);
  }
  return providers;
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

// ---------------------------------------------------------------------------
// Global outbound rate limiter (sliding window).
//
// Gmail app passwords and other free SMTP providers throttle bursts (roughly
// ~1 msg/sec and a low daily cap). With 1000+ voters requesting OTPs at the
// same time, we can trip that throttle and drop a fraction of emails. This
// paces all outbound sends to a safe rate (SMTP_MAX_PER_MINUTE, default 60) so
// we never burst past the provider's limit. When the window is full we WAIT for
// a slot instead of failing, so every email still goes out — just smooths the
// load. The limiter's history auto-expires, and it is intentionally bounded.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000; // 1-minute sliding window
const MAX_SAFE_QUEUE_MS = 90_000; // never wait more than this before giving up
const sendTimestamps: number[] = [];

function getRateLimitPerMinute(): number {
  const raw = Number(process.env.SMTP_MAX_PER_MINUTE);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 60;
}

/**
 * Wait until the number of sends in the last minute is below the limit.
 * Resolves true when a slot is free to send now, or false if we waited too
 * long (so the caller can bail out rather than stall the vote).
 */
export async function acquireSendSlot(): Promise<boolean> {
  const limit = getRateLimitPerMinute();
  const deadline = Date.now() + MAX_SAFE_QUEUE_MS;
  while (Date.now() < deadline) {
    const now = Date.now();
    // Prune timestamps older than the window.
    while (sendTimestamps.length && sendTimestamps[0] <= now - RATE_LIMIT_WINDOW_MS) {
      sendTimestamps.shift();
    }
    if (sendTimestamps.length < limit) {
      sendTimestamps.push(now);
      return true;
    }
    // Window is full — wait a moment then re-check. Paces the burst.
    await delay(250);
  }
  return false;
}

/** Mark a send that ended up not being delivered so it frees a slot. */
export function releaseSendSlot() {
  sendTimestamps.shift();
}

export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<MailResult> {
  // Pace this send to respect the provider burst limit before trying anywhere.
  if (!(await acquireSendSlot())) {
    return {
      sent: false,
      error:
        "Too many verification codes are being generated right now. Please wait a moment and try again.",
    };
  }
  let providerCount = 0;
  while (readProvider(providerCount)) providerCount++;
  if (providerCount === 0) {
    return { sent: false, error: "No SMTP providers configured" };
  }
  const providers = collectProviders(providerCount);

  // Order for this message: start at the round-robin cursor, then cycle through
  // the rest as ordered fallbacks. This spreads load and avoids hammering a
  // single primary provider first.
  const start = nextStart(providerCount);
  const ordered: Provider[] = [];
  for (let i = 0; i < providerCount; i++) {
    ordered.push(providers[(start + i) % providerCount]);
  }

  let lastErr: string | null = null;
  const attempts: number[] = [];

  for (const provider of ordered) {
    let transporter: Transporter | null = null;
    try {
      transporter = buildTransporter(provider);
    } catch (err) {
      console.error("[mailer] failed to create transporter:", err);
      continue;
    }

    let providerErr: string | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await transporter.sendMail({
          from: provider.from,
          to,
          subject,
          html,
        });
        lastErr = null;
        return {
          sent: true,
          provider: provider.host,
          attempts: attempt,
        };
      } catch (err) {
        providerErr = err instanceof Error ? err.message : String(err);
        const code = (err as any)?.code || "";
        console.error(
          `[mailer] provider ${provider.host} attempt ${attempt} failed: ${providerErr}${code ? ` (${code})` : ""}`
        );
        // Don't retry on permanent auth / invalid-recipient errors.
        if (/535|534|533|501|510|550 .*no such user|454/.test(String(providerErr))) break;
        if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
          await delay(RETRY_DELAY_MS * attempt);
        } else {
          break;
        }
      }
    }

    lastErr = providerErr || lastErr;
    attempts.push((transporter as any)?.options?.port || provider.port);
    transporter.close();
  }

  // Nothing delivered — free the pacing slot so other sends aren't blocked by
  // a failed one.
  releaseSendSlot();

  return {
    sent: false,
    provider: ordered.map((p) => p.host).join(", "),
    attempts: attempts.length,
    error: lastErr || "All SMTP providers failed",
  };
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
