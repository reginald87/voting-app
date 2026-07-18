import PDFDocument from "pdfkit";
import type { Report } from "./report";

export function reportToPdf(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const brand: [number, number, number] = [31, 89, 224];
    const ink: [number, number, number] = [15, 23, 42];
    const muted: [number, number, number] = [100, 116, 139];

    const s = report.summary;

    // Header
    doc
      .fontSize(18)
      .fillColor(brand)
      .text("BMU SUG Elections — Official Report", { align: "left" });
    doc
      .fontSize(10)
      .fillColor(muted)
      .text(
        "Bayelsa Medical University · Student Union Government Electoral Commission"
      );
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor(muted)
      .text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(1);

    // Summary
    doc.fontSize(13).fillColor(ink).text("Election Summary");
    doc.moveDown(0.3);
    const summaryRows: [string, string][] = [
      ["Total Registered Voters", String(s.totalRegistered)],
      ["Accredited Voters", String(s.accredited)],
      ["Pending Accreditation", String(s.pending)],
      ["Total Votes Cast", String(s.totalVotes)],
      ["Positions", String(s.positions)],
      ["Aspirants", String(s.aspirants)],
      ["Voting Status", s.votingOpen ? "OPEN" : "CLOSED"],
    ];
    drawTable(doc, ["Metric", "Value"], [320, 195], summaryRows.map((r) => r), [
      brand,
      ink,
    ]);

    // Accreditation vs votes
    doc.moveDown(1);
    doc.fontSize(13).fillColor(ink).text("Accreditation vs Votes Cast");
    doc.moveDown(0.3);
    const accRows: [string, string, string][] = [
      ["Accredited voters", String(s.accredited), `${pct(s.accredited, s.totalRegistered)}%`],
      ["Pending accreditation", String(s.pending), `${pct(s.pending, s.totalRegistered)}%`],
      ["Total votes cast", String(s.totalVotes), `${pct(s.totalVotes, s.accredited || 1)}% of accredited`],
    ];
    drawTable(
      doc,
      ["Indicator", "Count", "Rate"],
      [250, 150, 115],
      accRows,
      [ink, ink, ink]
    );

    // Results by position
    doc.addPage();
    doc.fontSize(13).fillColor(ink).text("Results by Position");
    doc.moveDown(0.5);

    const byPosition = new Map<string, typeof report.results>();
    for (const r of report.results) {
      if (!byPosition.has(r.position)) byPosition.set(r.position, []);
      byPosition.get(r.position)!.push(r);
    }

    for (const [position, rows] of byPosition) {
      if (doc.y > 720) doc.addPage();
      doc.fontSize(11).fillColor(brand).text(position);
      doc.moveDown(0.2);
      const posTotal = rows.reduce((t, r) => t + r.votes, 0);
      const max = Math.max(1, ...rows.map((r) => r.votes));
      for (const r of rows) {
        const isWinner = r.isWinner && posTotal > 0;
        doc
          .fontSize(10)
          .fillColor(isWinner ? [22, 163, 74] : ink)
          .text(
            `${r.candidate}${isWinner ? "  ★ WINNER" : ""}  —  ${r.votes} votes (${r.percentage}%)`,
            { continued: false }
          );
        doc.fontSize(8).fillColor(muted).text(`${r.department} · ${r.level}`);
        const barX = 40;
        const barY = doc.y + 2;
        const barW = 380;
        doc.roundedRect(barX, barY, barW, 6, 3).fillColor("#e2e8f0").fill();
        doc
          .roundedRect(barX, barY, (barW * r.votes) / max, 6, 3)
          .fillColor(isWinner ? [22, 163, 74] : brand)
          .fill();
        doc.moveDown(1.1);
      }
      doc.moveDown(0.4);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#e2e8f0").stroke();
      doc.moveDown(0.6);
    }

    doc.end();
  });
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  colWidths: number[],
  rows: (string | number)[][],
  _colors: [number, number, number][]
) {
  let x = 40;
  let y = doc.y;
  const rowH = 18;
  // header
  doc.font("Helvetica-Bold").fontSize(9).fillColor([71, 85, 105]);
  headers.forEach((h, i) => {
    doc.text(h, x, y, { width: colWidths[i] });
    x += colWidths[i];
  });
  y += rowH;
  doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor("#e2e8f0").stroke();

  doc.font("Helvetica").fontSize(9).fillColor([15, 23, 42]);
  for (const row of rows) {
    x = 40;
    for (let i = 0; i < headers.length; i++) {
      doc.text(String(row[i] ?? ""), x, y, { width: colWidths[i] });
      x += colWidths[i];
    }
    y += rowH;
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
  }
}
