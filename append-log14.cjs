const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md');
const tsPath = path.join(__dirname, 'src/data/aiConversationLog.ts');

const timestamp = "2026-05-17 20:33:44 CST (+0800)";
const userInput = `1.吧图一的弹窗删去，不做了以后就直接确认不做了2.把这些文案里的表情都删了`;

const aiFinalOutput = `已根据要求进行以下修改：
1. **移除删除确认弹窗**：在详情页中，点击“不做了也没关系”现在会直接触发删除逻辑，不再弹出二次确认弹窗。同时清理了多余的 \`showConfirmDelete\` 状态。
2. **移除文案表情**：已移除全站（包括顶部能量护盾、记忆片刻、已完成状态、空状态等）新增文案中的所有 Emoji 表情，进一步提升极客克制感。

代码修改无 TS 报错，且已通过 \`pnpm verify:answer\` 验证。

测试链接：http://127.0.0.1:5173/`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "pnpm build 编译通过",
  "pnpm verify:answer 验证通过",
  "页面修改已本地验证：http://127.0.0.1:5173/"
];

// Append to Markdown
let mdContent = fs.readFileSync(mdPath, 'utf8');
const newMdEntry = `\n## ${timestamp}\n\n### 用户输入\n${userInput}\n\n### AI 最终输出\n${aiFinalOutput}\n\n### 本轮改动文件\n${changedFiles.map(f => '- ' + f).join('\n')}\n\n### 验证结果\n${verification.map(v => '- ' + v).join('\n')}\n`;
fs.writeFileSync(mdPath, mdContent + newMdEntry);

// Append to TS
let tsContent = fs.readFileSync(tsPath, 'utf8');
const entryObj = {
  timestamp,
  userInput,
  aiFinalOutput,
  changedFiles,
  verification
};
const tsEntryStr = JSON.stringify(entryObj, null, 2).replace(/\n/g, '\n  ');
tsContent = tsContent.replace(/];\s*$/, `  ,\n  ${tsEntryStr}\n];\n`);
fs.writeFileSync(tsPath, tsContent);

console.log("Appended successfully!");