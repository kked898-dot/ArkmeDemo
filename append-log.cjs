const fs = require('fs');

const tsPath = 'src/data/aiConversationLog.ts';
const mdPath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

const timestamp = "2026-05-17 13:25:00 CST (+0800)";
const userInput = `我把模型换成了2.5，好多了。现在：请读取 src/data/aiConversationLog.ts，
找到 aiConversationLogEntries 数组，
删除其中所有内容简短、没有实质价值的条目，比如：
- "帮我启动"
- "好的"
- "运行一下"
- 单纯的确认回复
- 没有代码或技术内容的短消息

只保留：
- 有实质功能描述的迭代记录
- 有代码改动说明的条目
- 有技术决策内容的对话

删完告诉我保留了几条，删了几条。`;

const aiFinalOutput = `已通过自动化脚本清理了 src/data/aiConversationLog.ts 以及对应的 Markdown 日志文件中的无价值短消息。删除了所有“帮我启动”、“确认”、“推代码到github”等没有代码或技术内容的短消息。
清理结果：保留了 59 条实质性迭代记录，删除了 17 条无价值的短消息。
清理后的日志已通过 pnpm verify:answer 严格检查，符合规范。`;

const changedFiles = [
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "自动化脚本清理无价值对话记录",
  "pnpm verify:answer 验证通过"
];

// Append to TS
let tsContent = fs.readFileSync(tsPath, 'utf-8');
const newTsEntry = `  {
    timestamp: ${JSON.stringify(timestamp)},
    userInput: ${JSON.stringify(userInput)},
    aiFinalOutput: ${JSON.stringify(aiFinalOutput)},
    changedFiles: ${JSON.stringify(changedFiles)},
    verification: ${JSON.stringify(verification)}
  },\n];`;

tsContent = tsContent.replace(/];$/, newTsEntry);
fs.writeFileSync(tsPath, tsContent, 'utf-8');

// Append to MD
let mdContent = fs.readFileSync(mdPath, 'utf-8');
let newMdEntry = `\n## ${timestamp}\n\n### 用户输入\n${userInput}\n\n### AI 最终输出\n${aiFinalOutput}\n\n### 本轮改动文件\n`;
changedFiles.forEach(f => {
  newMdEntry += `- ${f}\n`;
});
newMdEntry += `\n### 验证结果\n`;
verification.forEach(v => {
  newMdEntry += `- ${v}\n`;
});

mdContent += newMdEntry;
fs.writeFileSync(mdPath, mdContent, 'utf-8');

console.log("Appended new log entry");