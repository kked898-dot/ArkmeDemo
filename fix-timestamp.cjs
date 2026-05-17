const fs = require('fs');

const tsPath = 'src/data/aiConversationLog.ts';
const mdPath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

let tsContent = fs.readFileSync(tsPath, 'utf-8');
tsContent = tsContent.replace(/2026-5-16/g, '2026-05-16');
fs.writeFileSync(tsPath, tsContent, 'utf-8');

let mdContent = fs.readFileSync(mdPath, 'utf-8');
mdContent = mdContent.replace(/2026-5-16/g, '2026-05-16');
fs.writeFileSync(mdPath, mdContent, 'utf-8');

console.log("Fixed timestamps");