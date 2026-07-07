const fs = require("fs");
const { marked } = require("marked");

const md = fs.readFileSync(
  "C:\\Users\\lenov\\.gemini\\antigravity\\brain\\3ef8662c-c071-41b7-81ef-ac8f878ed486\\artifacts\\hireai_project_report.md",
  "utf8"
);

// Extract mermaid blocks BEFORE marked processes them (to avoid HTML escaping)
const mermaidBlocks = [];
const withPlaceholders = md.replace(/```mermaid\n([\s\S]*?)```/g, (match, content) => {
  const idx = mermaidBlocks.length;
  mermaidBlocks.push(content.trim());
  return `MERMAID_PLACEHOLDER_${idx}`;
});

// Convert markdown to HTML
let body = marked.parse(withPlaceholders);

// Put mermaid blocks back as raw divs (unescaped)
mermaidBlocks.forEach((block, idx) => {
  body = body.replace(
    new RegExp(`<p>MERMAID_PLACEHOLDER_${idx}</p>`, 'g'),
    `<div class="mermaid">\n${block}\n</div>`
  );
  // Also handle case where it's not wrapped in <p>
  body = body.replace(
    new RegExp(`MERMAID_PLACEHOLDER_${idx}`, 'g'),
    `<div class="mermaid">\n${block}\n</div>`
  );
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>HireAI - Final Year Project Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; line-height: 1.7; background: #fff; padding: 40px 60px; max-width: 900px; margin: 0 auto; }
  @media print {
    body { padding: 20px 30px; font-size: 11pt; }
    h1 { font-size: 22pt !important; } h2 { font-size: 16pt !important; } h3 { font-size: 13pt !important; }
    table { font-size: 10pt; } pre { font-size: 9pt !important; }
    .no-print { display: none !important; }
    .mermaid svg { max-width: 100% !important; page-break-inside: avoid; }
  }
  h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 32px 0 8px; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
  h2 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 32px 0 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  h3 { font-size: 16px; font-weight: 600; color: #334155; margin: 20px 0 10px; }
  p { margin: 8px 0 12px; color: #334155; }
  hr { border: none; height: 1px; background: #e2e8f0; margin: 24px 0; }
  strong { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0 20px; font-size: 13px; }
  th { background: #6366f1; color: white; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  tr:nth-child(even) { background: #f8fafc; }
  code { background: #f1f5f9; color: #6366f1; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 13px; }
  pre { background: #1e293b; color: #e2e8f0; padding: 18px 20px; border-radius: 10px; overflow-x: auto; margin: 14px 0; font-family: 'Fira Code', monospace; font-size: 13px; line-height: 1.6; }
  pre code { background: none; color: inherit; padding: 0; }
  ul, ol { margin: 8px 0 14px 24px; color: #334155; }
  li { margin: 4px 0; }
  .mermaid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 16px 0; text-align: center; overflow-x: auto; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; z-index: 100; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(99,102,241,0.4); font-family: 'Inter', sans-serif; }
  .print-btn:hover { transform: translateY(-2px); }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Save as PDF</button>
  ${body}
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });
  <\/script>
</body>
</html>`;

const outPath = "c:\\Users\\lenov\\OneDrive\\Desktop\\FinalYear-project\\hireai\\HireAI_Project_Report.html";
fs.writeFileSync(outPath, html, "utf8");
console.log("Report saved to:", outPath);
