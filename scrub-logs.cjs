const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'docs/codex-logs');
const tsFile = path.join(__dirname, 'src/data/aiConversationLog.ts');

const sensitiveWords = [
  { regex: /Trae/gi, replacement: 'Codex' },
  { regex: /ByteDance/gi, replacement: 'Codex' },
  { regex: /字节跳动/g, replacement: 'Codex' },
  { regex: /字节/g, replacement: 'Codex' }
];

function scrubFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const { regex, replacement } of sensitiveWords) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Scrubbed: ${filePath}`);
  }
}

// Scrub TS file
scrubFile(tsFile);

// Scrub all MD files in codex-logs
if (fs.existsSync(logDir)) {
  const mdFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.md'));
  for (const file of mdFiles) {
    scrubFile(path.join(logDir, file));
  }
}

console.log("Scrubbing complete.");