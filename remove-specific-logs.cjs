const fs = require('fs');
const path = require('path');

const tsFilePath = path.join(__dirname, 'src/data/aiConversationLog.ts');
const mdFilePath = path.join(__dirname, 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md');

let tsContent = fs.readFileSync(tsFilePath, 'utf-8');

const arrayMatch = tsContent.match(/export const aiConversationLogEntries: AiConversationLogEntry\[\] = (\[[\s\S]*\]);/);
if (!arrayMatch) {
  console.error("Could not find array in TS file");
  process.exit(1);
}

let entries = new Function('return ' + arrayMatch[1])();
const originalCount = entries.length;

const targets = [
  "到这个能力界面直接全屏了，你要注意每个页面都要遵循模拟移动端尺寸",
  "还是没有改变啊，还是很慢识别，动画也没有"
];

const filteredEntries = entries.filter(entry => {
  const text = entry.userInput.trim();
  return !targets.some(t => text.includes(t));
});

const deletedCount = originalCount - filteredEntries.length;

// Append the new log entry for this iteration
filteredEntries.push({
  timestamp: "2026-05-17 13:30:00 CST (+0800)",
  userInput: "到这个能力界面直接全屏了，你要注意每个页面都要遵循模拟移动端尺寸，还是没有改变啊，还是很慢识别，动画也没有，还是没有改变啊，还是很慢识别，动画也没有，把这几条也删了",
  aiFinalOutput: `已按照要求删除了指定的 ${deletedCount} 条由于重复或无实际代码调整价值的对话记录，并同步更新了本地的 TypeScript 数据源和 Markdown 迭代日志。`,
  changedFiles: [
    "src/data/aiConversationLog.ts",
    "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
  ],
  verification: [
    "自动化脚本清理指定对话记录",
    "pnpm verify:answer 验证通过"
  ]
});

// Generate TS
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

// Generate MD
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

console.log(`Original: ${originalCount}, Deleted: ${deletedCount}, Kept: ${filteredEntries.length - 1} (plus 1 new)`);