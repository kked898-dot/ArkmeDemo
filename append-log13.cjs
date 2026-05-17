const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md');
const tsPath = path.join(__dirname, 'src/data/aiConversationLog.ts');

const timestamp = "2026-05-17 20:28:45 CST (+0800)";
const userInput = `我们现在要执行交付前的最后一次微调：降低全站文案的甜度，去掉多余的修辞，注入更高级的极客克制感，同时保持文艺和温暖的调性。

请安全修改 src/pages/ArrangePage.tsx 中对应的文案变量或渲染逻辑，绝不修改核心状态代码：

1. 找到顶部能量护盾拦截文案：
   将原有的内耗、别担心陪你搞定等文案，精准替换为：
   “✨ 监测到今日心理负荷较高的重要事项（\${...}）。非紧急杂务提醒已自动静音。把精力留给最重要的人和事，Jarvis 在。”

2. 找到自定义“温柔放手”弹窗的文本：
   将原有的“让它轻轻过去吧”替换为：
   “☕ 允许生活的变数发生。这项安排将从当前的数字化底座中归档，确认不做了吗？”
   并将弹窗左侧按钮文案改为：“留着吧”，右侧按钮文案改为：“顺其自然”。

3. 找到已完成状态（done/auto_done）详情页下方的只读文案：
   将原有文本替换为：
   “✓ 落子无悔。这项安排已被时光温柔留存。 (RECORDED_AND_ARCHIVED)”

4. 找到列表为空时的空状态文案：
   将原有文本替换为：
   “📦 空山留白。留出空间，等你想做的事情自然发生。”

修改完成后，请在后台帮我执行 pnpm verify:answer。确保全站编译正常通过，不留任何语法遗憾！`;

const aiFinalOutput = `已完成全站文案的最后一次“极客克制感”微调，在保持文艺和温暖调性的同时，降低了多余的修辞：
1. **顶部能量护盾**：文案已更新为“✨ 监测到今日心理负荷较高的重要事项（...）。非紧急杂务提醒已自动静音。把精力留给最重要的人和事，Jarvis 在。”
2. **“温柔放手”确认弹窗**：文本已替换为“☕ 允许生活的变数发生。这项安排将从当前的数字化底座中归档，确认不做了吗？”。按钮文案本身已是“留着吧”和“顺其自然”，在此予以确认。
3. **详情页纯净化（Read-Only Flow）**：完成状态的只读文案已更新为“✓ 落子无悔。这项安排已被时光温柔留存。 (RECORDED_AND_ARCHIVED)”。
4. **空状态呼吸留白**：列表为空时的文案已更新为“📦 空山留白。留出空间，等你想做的事情自然发生。”。

所有修改均仅涉及文本层面的替换，未动核心状态逻辑。代码已通过 \`pnpm verify:answer\` 验证，完全绿灯。

测试链接：http://127.0.0.1:5173/`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "pnpm build 编译通过",
  "pnpm verify:answer 验证通过",
  "页面文案修改已本地验证：http://127.0.0.1:5173/"
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