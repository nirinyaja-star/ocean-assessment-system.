// Raw (non-analyzed) answer export. Deliberately has NO access to
// work-mindset-assessment-engine.js's analysis functions — only to
// question TEXT and OPTION TEXT, so there is no way for this module to
// accidentally leak a score, indicator, or pattern. That separation is
// enforced by what this file requires, not just by convention.
'use strict';
const fs = require('fs');
const path = require('path');
const docx = require('docx');
const registry = require('./questionRegistry');

const EXPORT_DIR = path.join(__dirname, '..', 'data', 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

function rows(answerMap) {
  return registry.entries.map((e) => {
    const idx = answerMap[e.questionId];
    return {
      questionId: e.questionId,
      kind: e.kind,
      question: e.text,
      selectedOptionIndex: idx == null ? null : idx,
      selectedOptionText: idx == null ? null : e.options[idx] || null,
    };
  });
}

function toJson(answerMap, meta) {
  return JSON.stringify({ meta, answers: rows(answerMap) }, null, 2);
}

/** CSV with formula-injection prevention (leading ' for any value starting with =+-@) and a UTF-8 BOM for Excel/Thai compatibility. */
function toCsv(answerMap, meta) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // formula injection guard
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = ['questionId', 'kind', 'question', 'selectedOptionIndex', 'selectedOptionText'];
  const lines = [`candidateName,${esc(meta.candidateName)}`, `assessmentVersion,${esc(meta.assessmentVersion)}`, '', header.join(',')];
  rows(answerMap).forEach((r) => {
    lines.push(header.map((h) => esc(r[h])).join(','));
  });
  return '﻿' + lines.join('\r\n');
}

async function toDocx(answerMap, meta) {
  const { Document, Packer, Paragraph, HeadingLevel } = docx;
  const children = [
    new Paragraph({ text: 'คำตอบดิบ (ไม่มีการวิเคราะห์)', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `ผู้สมัคร: ${meta.candidateName || ''}` }),
    new Paragraph({ text: `Assessment ${meta.assessmentVersion} · ${new Date().toISOString()}` }),
  ];
  rows(answerMap).forEach((r, i) => {
    children.push(new Paragraph({ text: `${i + 1}. [${r.kind}] ${r.question}`, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: r.selectedOptionText || '(ไม่ได้ตอบ)' }));
  });
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

let _browserPromise = null;
function getBrowser() {
  if (!_browserPromise) {
    const { chromium } = require('playwright');
    _browserPromise = chromium.launch();
  }
  return _browserPromise;
}

async function toPdf(answerMap, meta) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const body = rows(answerMap)
    .map((r, i) => `<div style="margin-bottom:10px"><strong>${i + 1}. [${esc(r.kind)}] ${esc(r.question)}</strong><br>${esc(r.selectedOptionText || '(ไม่ได้ตอบ)')}</div>`)
    .join('');
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"></head><body style="font-family:sans-serif;margin:24px">
    <h1>คำตอบดิบ (ไม่มีการวิเคราะห์)</h1>
    <p>ผู้สมัคร: ${esc(meta.candidateName)}</p>
    ${body}
    </body></html>`;
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.pdf({ format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
  await page.close();
  return buf;
}

async function closeBrowser() {
  if (_browserPromise) {
    const b = await _browserPromise;
    await b.close();
    _browserPromise = null;
  }
}

module.exports = { toJson, toCsv, toDocx, toPdf, closeBrowser, EXPORT_DIR };
