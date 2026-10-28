import { jsPDF } from "jspdf";
import type { GameSet, Statement } from "./types";

const MARGIN = 56;
const PAGE_WIDTH = 612; // US Letter, points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function exportSetToPdf(set: GameSet, statements: Statement[]) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // ---------- Page 1: student worksheet ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(set.title, MARGIN, MARGIN);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `${set.level ? `${set.level} · ` : ""}${statements.length} statements · Name: ________________________`,
    MARGIN,
    MARGIN + 18
  );

  let y = MARGIN + 50;
  doc.setTextColor(20, 20, 20);

  statements.forEach((s, i) => {
    if (y > 740) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(`${i + 1}. ${s.text}`, CONTENT_WIDTH - 90);
    doc.text(lines, MARGIN, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.rect(MARGIN + CONTENT_WIDTH - 80, y - 10, 14, 14);
    doc.text("Correct", MARGIN + CONTENT_WIDTH - 62, y);
    doc.rect(MARGIN + CONTENT_WIDTH - 80, y + 10, 14, 14);
    doc.text("Incorrect", MARGIN + CONTENT_WIDTH - 62, y + 20);

    y += lines.length * 13 + 10;
    doc.setDrawColor(210, 210, 210);
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH - 90, y);
    y += 24;
  });

  // ---------- Page 2+: answer key ----------
  doc.addPage();
  y = MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("Answer key", MARGIN, y);
  y += 30;

  statements.forEach((s, i) => {
    if (y > 740) {
      doc.addPage();
      y = MARGIN;
    }

    const isSentenceMode = set.answer_mode === "sentence";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    if (isSentenceMode) {
      doc.setTextColor(13, 92, 88);
      doc.text(`${i + 1}. Write the sentence`, MARGIN, y);
    } else {
      doc.setTextColor(s.is_correct ? 20 : 180, s.is_correct ? 120 : 50, s.is_correct ? 90 : 40);
      doc.text(`${i + 1}. ${s.is_correct ? "Correct" : "Incorrect"}`, MARGIN, y);
    }
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const statementLines = doc.splitTextToSize(s.text, CONTENT_WIDTH);
    doc.text(statementLines, MARGIN, y);
    y += statementLines.length * 12 + 4;

    if (isSentenceMode && s.correction) {
      doc.setTextColor(13, 92, 88);
      const fixLines = doc.splitTextToSize(`Answer: ${s.correction}`, CONTENT_WIDTH);
      doc.text(fixLines, MARGIN, y);
      y += fixLines.length * 12 + 2;
    }
    if (!isSentenceMode && !s.is_correct && s.correction) {
      doc.setTextColor(13, 92, 88);
      const fixLines = doc.splitTextToSize(`Fix: ${s.correction}`, CONTENT_WIDTH);
      doc.text(fixLines, MARGIN, y);
      y += fixLines.length * 12 + 2;
    }
    if ((isSentenceMode || !s.is_correct) && s.explanation) {
      doc.setTextColor(110, 110, 110);
      doc.setFontSize(9);
      const explLines = doc.splitTextToSize(s.explanation, CONTENT_WIDTH);
      doc.text(explLines, MARGIN, y);
      y += explLines.length * 11 + 2;
    }
    doc.setTextColor(20, 20, 20);
    y += 14;
  });

  const filename = set.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "set";
  doc.save(`${filename}.pdf`);
}
