import { requireAdmin } from "@/lib/session";
import { buildReport, reportToCsv } from "@/lib/report";
import { reportToPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

function ts() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const report = await buildReport();

  if (format === "csv") {
    const csv = reportToCsv(report);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bmu-sug-report-${ts()}.csv"`,
      },
    });
  }

  const pdf = await reportToPdf(report);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bmu-sug-report-${ts()}.pdf"`,
    },
  });
}
