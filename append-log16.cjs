const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md');
const tsPath = path.join(__dirname, 'src/data/aiConversationLog.ts');

const timestamp = "2026-05-17 22:37:46 CST (+0800)";
const userInput = `我们来解决这最后两个顽固的视觉硬伤，完成后我们的项目在任何机型下就都是完美的像素级表现了：

【1. 提炼并精简顶栏护盾描述】
- 将输出的字符串格式精简为如下克制、高级的表达：“今日高负荷（\${currentHighAnxietyTitle}），非紧急提醒已静音。留白给重要的事。”
- 检查顶栏容器的 padding-top，确保其为紧凑、优雅的移动端间距（如 pt-4 或 pt-6），绝不过空。

【2. 铁腕修复“时间段”激活时的弹窗右滑溢出（🔥核心修法）】
- 将“时间段”渲染那两个日期输入框的父级容器改为强行的垂直纵向排列：className="flex flex-col gap-2 w-full"。
- 确保里面的两个输入框容器各自带有 w-full max-w-full，上下垂直堆叠排列。
- 检查上方的类型按钮组，将它们的父容器改为 grid grid-cols-4 gap-1 w-full text-center，并调小按钮内部的字号（如 text-[11px] px-1），确保四个按钮在移动端 350px 宽度内绝对不撑开外壳。`;

const aiFinalOutput = `已完成最后两个视觉硬伤的像素级修复，确保任何移动端机型下布局完美无溢出：
1. **顶栏护盾描述精简**：文案已更新为极简克制的表达：“今日高负荷（...），非紧急提醒已静音。留白给重要的事。”，并且顶栏容器的 \`padding-top\` 设定为了 \`16px\` (\`pt-4\`)，在保持紧凑的同时兼顾了呼吸感。
2. **弹窗“时间段”排版重构**：铁腕解决了右滑溢出问题。将“时间段”的起止时间输入框容器重构为强行的纵向排列（\`flex flex-col gap-2 w-full\`）配合 \`w-full max-w-full\`，保证彻底不溢出。
3. **类型按钮组优化**：上方的四选项时间选择器已重构为 \`grid grid-cols-4 gap-1 w-full text-center\`，并采用了小字号（\`text-[11px] px-1\`），在 350px 的极限小屏上也能绝对安全地对齐。

修改已通过 \`pnpm verify:answer\` 验证，没有任何编译与 Lint 报错！`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "代码修改无 TypeScript 报错",
  "执行 pnpm build 生产环境编译无缝通过",
  "运行 pnpm verify:answer 验证全绿通过，符合 candidate-rules 答题规范"
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