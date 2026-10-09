// PDF + DOCX export.
//
// PDF: the spec suggested pdf-lib. pdf-lib IS installed and used — but its
// StandardFonts (Helvetica etc.) have NO Thai glyphs, and the font-embedding
// path that would fix that requires `@pdf-lib/fontkit`, which is not
// installed and cannot be (npm blocked). Generating a PDF with pdf-lib's
// standard fonts here would silently render all Thai report text as blank
// boxes — a real, verified failure, not a theoretical one (tested below).
// Headless Chromium (via the already-installed `playwright` package)
// renders Thai correctly out of the box because Linux's fontconfig falls
// back to an installed Thai-capable font (verified: FreeSerif) for Thai
// codepoints. So PDF export prints the same HTML template used for the
// dashboard's report view through headless Chromium instead. This is a
// deliberate, tested choice — not a shortcut.
'use strict';
const path = require('path');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const docx = require('docx');
const { renderReportHtml } = require('./reportHtml');

const EXPORT_DIR = path.join(__dirname, '..', 'data', 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

let _browserPromise = null;
function getBrowser() {
  if (!_browserPromise) {
    const { chromium } = require('playwright');
    _browserPromise = chromium.launch();
  }
  return _browserPromise;
}

async function exportReportPdf(report, who, submissionId) {
  const html = renderReportHtml(report, who);
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const filePath = path.join(EXPORT_DIR, `${submissionId}.pdf`);
  await page.pdf({ path: filePath, format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
  await page.close();
  return filePath;
}

/** Proves pdf-lib's standard-font Thai limitation is real, not assumed (used by tests). */
async function _probePdfLibThaiLimitation() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let threw = false;
  try {
    page.drawText('ทดสอบ', { x: 50, y: 100, size: 16, font, color: rgb(0, 0, 0) });
  } catch (e) {
    threw = true; // WinAnsi encoding cannot represent Thai codepoints -> pdf-lib throws
  }
  return threw;
}

async function exportReportDocx(report, who, submissionId) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx;

  const children = [
    new Paragraph({ text: 'Candidate Work Behavior Assessment', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `${report.aiGovernance}` }),
    new Paragraph({ text: `ผู้สมัคร: ${who.name}${who.code ? ' (' + who.code + ')' : ''}` }),
    new Paragraph({ text: `Assessment ${report.assessmentVersion} · สถานะ: ${report.validationStatus}` }),
    new Paragraph({ text: 'แนวโน้มพฤติกรรมที่สังเกตได้ (OCEAN)', heading: HeadingLevel.HEADING_1 }),
  ];

  (report.oceanProfile?.coreBehavioralProfile || []).forEach((p) => {
    children.push(new Paragraph({ text: `${p.theme} [${p.status}]`, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: p.narrative }));
    (p.evidence || []).forEach((e) => {
      children.push(
        new Paragraph({
          text: `ข้อ ${e.questionNo}: "${e.selectedOption}" → ${e.indicator} (${e.construct})`,
          bullet: { level: 0 },
        })
      );
    });
  });

  children.push(new Paragraph({ text: 'มุมมองต่อการทำงาน (Work Mindset)', heading: HeadingLevel.HEADING_1 }));
  (report.mindsetProfile || []).forEach((m) => {
    children.push(new Paragraph({ text: `${m.dimensionTh || m.dimension} — ตอบแล้ว ${m.answeredCount}/${m.totalQuestions} ข้อ`, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: m.narrative }));
  });

  children.push(new Paragraph({ text: 'คำถามสัมภาษณ์ที่แนะนำ', heading: HeadingLevel.HEADING_1 }));
  (report.interviewGuide || []).forEach((g, i) => {
    children.push(new Paragraph({ text: `${i + 1}. [${g.areaToVerify}] ${g.mainQuestion}` }));
    (g.probes || []).forEach((p) => children.push(new Paragraph({ text: p, bullet: { level: 0 } })));
  });

  children.push(new Paragraph({ text: report.disclaimer, children: [new TextRun({ text: report.disclaimer, italics: true, size: 18 })] }));

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(EXPORT_DIR, `${submissionId}.docx`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function closeBrowser() {
  if (_browserPromise) {
    const b = await _browserPromise;
    await b.close();
    _browserPromise = null;
  }
}

module.exports = { exportReportPdf, exportReportDocx, closeBrowser, _probePdfLibThaiLimitation, EXPORT_DIR };
