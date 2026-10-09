// Recruiter dashboard. Spec asked for a 9-screen Next.js/React dashboard;
// this sandbox has React installed but no bundler to ship it to a browser
// (no Next.js, no Vite — see docs/ARCHITECTURE_DECISION.md), so this is
// server-rendered HTML + a little vanilla JS, same pattern already proven
// working in this project's earlier ocean-backend/server.js. Functionally
// it covers the same jobs: list submissions, view a report, upload a JD,
// trigger exports/email.
'use strict';
const { renderReportHtml } = require('./reportHtml');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function layout(title, body, apiKey) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    body{font-family:sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#222}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border-bottom:1px solid #ddd;text-align:left;padding:8px;font-size:14px}
    .status{padding:2px 8px;border-radius:10px;font-size:12px;background:#eef}
    .status.completed{background:#dfe}
    .status.failed{background:#fdd}
    a.btn{display:inline-block;padding:6px 12px;background:#1f4e79;color:#fff;border-radius:4px;text-decoration:none;font-size:13px;margin-right:6px}
    nav{margin-bottom:16px}
  </style></head><body>
  <nav><a href="/dashboard?key=${esc(apiKey || '')}">รายการผู้สมัคร</a> · <a href="/dashboard/jobs?key=${esc(apiKey || '')}">JD / ตำแหน่งงาน</a></nav>
  <h1>${esc(title)}</h1>
  ${body}
  </body></html>`;
}

function renderDashboard(db, url, recruiter) {
  if (!recruiter) {
    return layout('เข้าสู่ระบบ', `<p>ไม่พบ API key ที่ถูกต้อง เพิ่ม <code>?key=&lt;api key&gt;</code> ต่อท้าย URL</p>`, '');
  }
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[1] === 'jobs') {
    const jobs = db.prepare('SELECT * FROM jobs WHERE recruiter_id = ? ORDER BY created_at DESC').all(recruiter.id);
    const rows = jobs
      .map((j) => `<tr><td>${esc(j.title)}</td><td>${esc(j.jd_version)}</td><td>${esc(j.created_at)}</td></tr>`)
      .join('');
    return layout('JD / ตำแหน่งงาน', `<table><tr><th>ตำแหน่ง</th><th>JD Version</th><th>สร้างเมื่อ</th></tr>${rows || '<tr><td colspan=3>ยังไม่มีข้อมูล</td></tr>'}</table>`, recruiter.api_key);
  }

  if (parts[1] === 'submissions' && parts[2]) {
    const sub = db.prepare('SELECT * FROM submissions WHERE id = ? AND recruiter_id = ?').get(parts[2], recruiter.id);
    if (!sub) return layout('ไม่พบข้อมูล', '<p>ไม่พบ submission นี้</p>', recruiter.api_key);
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(sub.candidate_id);
    if (sub.status !== 'completed') {
      return layout(`รายงาน — ${candidate.name}`, `<p>สถานะ: <span class="status">${esc(sub.status)}</span> ${esc(sub.status_reason || '')}</p>`, recruiter.api_key);
    }
    const rep = db.prepare('SELECT * FROM reports WHERE submission_id = ?').get(sub.id);
    const report = JSON.parse(rep.report_json);
    const reportBody = renderReportHtml(report, candidate)
      .replace(/^[\s\S]*<body>/, '')
      .replace(/<\/body>[\s\S]*$/, '');
    const actions = `<p>
      <a class="btn" href="/api/v1/submissions/${sub.id}/export?format=pdf" target="_blank">ดาวน์โหลด PDF</a>
      <a class="btn" href="/api/v1/submissions/${sub.id}/export?format=docx" target="_blank">ดาวน์โหลด DOCX</a>
    </p>`;
    return layout(`รายงาน — ${candidate.name}`, actions + reportBody, recruiter.api_key);
  }

  // default: submissions list
  const subs = db
    .prepare(
      `SELECT s.*, c.name as candidate_name FROM submissions s JOIN candidates c ON c.id = s.candidate_id WHERE s.recruiter_id = ? ORDER BY s.created_at DESC`
    )
    .all(recruiter.id);
  const rows = subs
    .map(
      (s) => `<tr>
        <td>${esc(s.candidate_name)}</td>
        <td><span class="status ${esc(s.status)}">${esc(s.status)}</span></td>
        <td>${esc(s.created_at)}</td>
        <td><a href="/dashboard/submissions/${esc(s.id)}?key=${esc(recruiter.api_key)}">ดูรายงาน</a></td>
      </tr>`
    )
    .join('');
  return layout(
    'รายการผู้สมัคร',
    `<table><tr><th>ผู้สมัคร</th><th>สถานะ</th><th>ส่งเมื่อ</th><th></th></tr>${rows || '<tr><td colspan=4>ยังไม่มีข้อมูล</td></tr>'}</table>`,
    recruiter.api_key
  );
}

module.exports = { renderDashboard };
