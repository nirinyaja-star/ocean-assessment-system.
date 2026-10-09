// Renders the engine's report object as HTML. Used both for the recruiter
// dashboard's report view and as input to the PDF exporter (which prints
// this same HTML through headless Chromium — see export.js for why).
'use strict';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderReportHtml(report, who) {
  const oceanSection = (report.oceanProfile?.coreBehavioralProfile || [])
    .map(
      (p) => `
      <div class="pattern">
        <h3>${esc(p.theme)} <span class="tag">${esc(p.status)}</span></h3>
        <p>${esc(p.narrative)}</p>
        ${p.evidence?.length ? `<ul class="evidence">${p.evidence
          .map((e) => `<li>ข้อ ${esc(e.questionNo)}: "${esc(e.selectedOption)}" → ${esc(e.indicator)} (${esc(e.construct)})</li>`)
          .join('')}</ul>` : ''}
      </div>`
    )
    .join('');

  const mindsetSection = (report.mindsetProfile || [])
    .map(
      (m) => `
      <div class="pattern">
        <h3>${esc(m.dimensionTh || m.dimension)}</h3>
        <p>ตอบแล้ว ${esc(m.answeredCount)}/${esc(m.totalQuestions)} ข้อ</p>
        <p>${esc(m.narrative)}</p>
      </div>`
    )
    .join('');

  const interviewSection = (report.interviewGuide || [])
    .map(
      (g, i) => `<li><strong>[${esc(g.areaToVerify)}]</strong> ${esc(g.mainQuestion)}<ul>${(g.probes || [])
        .map((p) => `<li>${esc(p)}</li>`)
        .join('')}</ul></li>`
    )
    .join('');

  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<style>
  body { font-family: 'Noto Sans Thai', 'TH Sarabun New', Tahoma, sans-serif; color:#1a1a1a; margin:32px; line-height:1.6; }
  h1 { font-size:20px; border-bottom:2px solid #333; padding-bottom:8px; }
  h2 { font-size:16px; margin-top:28px; color:#1f4e79; }
  h3 { font-size:14px; margin:14px 0 4px; }
  .tag { font-size:11px; background:#eef; padding:2px 8px; border-radius:10px; color:#334; }
  .pattern { border-left:3px solid #9bb; padding-left:12px; margin-bottom:14px; }
  .evidence { font-size:12px; color:#444; }
  .disclaimer { font-size:12px; color:#888; border-top:1px solid #ccc; padding-top:10px; margin-top:28px; }
  .meta { font-size:12px; color:#555; }
</style></head>
<body>
  <h1>Candidate Work Behavior Assessment — ${esc(report.aiGovernance)}</h1>
  <p class="meta">
    ผู้สมัคร: ${esc(who.name)} ${who.code ? `(${esc(who.code)})` : ''}<br>
    Assessment ${esc(report.assessmentVersion)} · สถานะ: ${esc(report.validationStatus)}
  </p>

  <h2>แนวโน้มพฤติกรรมที่สังเกตได้ (OCEAN, พร้อมหลักฐาน)</h2>
  ${oceanSection || '<p>ไม่มีข้อมูลเพียงพอ</p>'}

  <h2>มุมมองต่อการทำงาน (Work Mindset)</h2>
  ${mindsetSection || '<p>ไม่มีข้อมูลเพียงพอ</p>'}

  <h2>คำถามสัมภาษณ์ที่แนะนำ</h2>
  <ol>${interviewSection}</ol>

  <p class="disclaimer">${esc(report.disclaimer)}</p>
</body></html>`;
}

module.exports = { renderReportHtml };
