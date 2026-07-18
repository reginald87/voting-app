import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const otps = await prisma.otp.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { voter: { select: { matNumber: true, email: true, firstName: true } } },
  });

  const rows = otps.map((o) => ({
    matNumber: o.voter.matNumber,
    name: o.voter.firstName,
    email: o.voter.email,
    code: o.code,
    used: o.used,
    expiresAt: o.expiresAt,
    createdAt: o.createdAt,
  }));

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Dev OTP Viewer — BMU SUG</title>
<style>
body{font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;color:#0f172a;margin:0;padding:24px}
h1{font-size:18px}table{border-collapse:collapse;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 10px 30px -12px rgba(15,23,42,.25)}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
th{background:#eef6ff;text-transform:uppercase;font-size:11px;color:#475569}
.code{font-family:monospace;font-size:16px;font-weight:700;letter-spacing:3px;color:#1f59e0}
.used{color:#94a3b8}.expired{color:#dc2626}
.meta{color:#64748b;font-size:12px;margin-bottom:16px}
.refresh{margin-left:12px;font-size:12px;color:#1f59e0}
</style></head><body>
<h1>Dev OTP Viewer <a class="refresh" href="">↻ refresh</a></h1>
<p class="meta">This page only shows OTPs when SMTP is not configured (dev mode). Codes are single-use and expire after 10 minutes.</p>
<table><thead><tr><th>Mat. Number</th><th>Name</th><th>Email</th><th>Code</th><th>Status</th><th>Created</th></tr></thead><tbody>
${rows
  .map((r) => {
    const expired = new Date(r.expiresAt).getTime() < Date.now();
    const status = r.used
      ? '<span class="used">used</span>'
      : expired
      ? '<span class="expired">expired</span>'
      : "active";
    return `<tr><td>${r.matNumber}</td><td>${r.name}</td><td>${r.email}</td><td class="code">${r.code}</td><td>${status}</td><td>${new Date(
      r.createdAt
    ).toLocaleString()}</td></tr>`;
  })
  .join("")}
</tbody></table>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
