const fs = require('fs');
const path = require('path');

const tsFilePath = path.join(__dirname, 'src/data/aiConversationLog.ts');
const mdFilePath = path.join(__dirname, 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md');

let tsContent = fs.readFileSync(tsFilePath, 'utf-8');

// Match the array content
const arrayMatch = tsContent.match(/export const aiConversationLogEntries: AiConversationLogEntry\[\] = (\[[\s\S]*\]);/);
if (!arrayMatch) {
  console.error("Could not find array in TS file");
  process.exit(1);
}

let entries;
try {
  // Use Function to safely evaluate the array string
  entries = new Function('return ' + arrayMatch[1])();
} catch (e) {
  console.error("Failed to parse array:", e);
  process.exit(1);
}

const originalCount = entries.length;

function isMeaningless(input) {
  const trimmed = input.trim();
  if (trimmed === '确认' || trimmed === '好的' || trimmed === '帮我启动' || trimmed === '运行一下' || trimmed === '推代码到github' || trimmed === '把这个更新推到GitHub里边。') {
    return true;
  }
  if (trimmed.includes('无法访问，请启动服务器')) {
    return true;
  }
  if (trimmed === '所以现在端口是什么，你运行起来') {
    return true;
  }
  if (trimmed === '帮我把两个应用都打开，我测试看看') {
    return true;
  }
  return false;
}

const filteredEntries = entries.filter(entry => !isMeaningless(entry.userInput));

const deletedCount = originalCount - filteredEntries.length;
const keptCount = filteredEntries.length;

console.log(`Original: ${originalCount}, Deleted: ${deletedCount}, Kept: ${keptCount}`);

// Format back to TS
let newTsContent = `export type AiConversationLogEntry = {
  timestamp: string;
  userInput: string;
  aiFinalOutput: string;
  changedFiles: string[];
  verification: string[];
};

export const aiConversationLogEntries: AiConversationLogEntry[] = [\n`;

filteredEntries.forEach(entry => {
  newTsContent += `  {
    timestamp: ${JSON.stringify(entry.timestamp)},
    userInput: ${JSON.stringify(entry.userInput)},
    aiFinalOutput: ${JSON.stringify(entry.aiFinalOutput)},
    changedFiles: ${JSON.stringify(entry.changedFiles)},
    verification: ${JSON.stringify(entry.verification)}
  },\n`;
});
newTsContent += `];\n`;

fs.writeFileSync(tsFilePath, newTsContent, 'utf-8');

// Now process the Markdown file
let mdContent = fs.readFileSync(mdFilePath, 'utf-8');
const mdHeaderMatch = mdContent.match(/^([\s\S]*?)(?=## \d{4}-\d{2}-\d{2})/);
let newMdContent = mdHeaderMatch ? mdHeaderMatch[1] : '';

filteredEntries.forEach(entry => {
  newMdContent += `## ${entry.timestamp}\n\n`;
  newMdContent += `### 用户输入\n${entry.userInput}\n\n`;
  newMdContent += `### AI 最终输出\n${entry.aiFinalOutput}\n\n`;
  newMdContent += `### 本轮改动文件\n`;
  entry.changedFiles.forEach(f => {
    newMdContent += `- ${f}\n`;
  });
  newMdContent += `\n### 验证结果\n`;
  entry.verification.forEach(v => {
    newMdContent += `- ${v}\n`;
  });
  newMdContent += `\n`;
});

fs.writeFileSync(mdFilePath, newMdContent, 'utf-8');
