const fs = require('fs');

const tsPath = 'src/data/aiConversationLog.ts';
const mdPath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

const timestamp = "2026-05-17 13:50:00 CST (+0800)";
const userInput = `现在我们开始进行第二轮迭代的第一步：重构顶部概览文案，实现“能量护盾”的文本感知。

请安全修改 src/pages/ArrangePage.tsx，找到位于第 62-85 行附近的 getTodaySummary 函数，将其逻辑精准升级：

【1. 定义高焦虑拦截逻辑】
在函数内部或上方，定义一个辅助的判断机制（或复用以下逻辑）：
- 焦虑心情列表：['焦虑', '抗拒', '疲惫', '心累', '紧张', '害怕']
- 高压任务关键词：['医院', '体检', '面试', '复查', '考试', '开会', '严苛']

编写判断逻辑：
- 筛选出属于今天（或 pending 状态中近期）的安排。
- 检查这些安排中，是否有任何一条的 arrangement.mood 包含了上述“焦虑心情”，或者 arrangement.title 包含了上述“高压关键词”。

【2. 升级文案系统（The Energy Summary）】
如果检测到【存在】高焦虑或重度任务：
- 设法拿到该高压任务的标题（如 currentHighAnxietyTitle，若无则默认为“重要事项”）。
- 将原有的“今天有 X 件事”文案彻底替换为以下充满产品温度与情绪感知的专属表达：
  “✨ 今天有一件让你有些内耗的事（\${currentHighAnxietyTitle}），Jarvis 已自动为你屏蔽了非紧急的杂务提醒。别担心，陪你一起搞定它。”

如果【不存在】高焦虑任务，则安全保留并沿用你之前实现的温和兜底文案（如“今天没有安排，好好休息”等）。

请安全修改该函数，确保不影响其余组件的正常运行，完成后告诉我！`;

const aiFinalOutput = `已成功在 \`ArrangePage.tsx\` 中升级了 \`getTodaySummary\` 函数，实现了“能量护盾”的文本感知逻辑。
具体修改包括：
1. **定义拦截逻辑**：在函数内部维护了 \`anxietyMoods\` 与 \`highPressureKeywords\` 两个数组。
2. **高压任务检测**：通过遍历当天的 \`pending\` 安排，使用 \`some\` 与 \`includes\` 方法联合检测，寻找是否存在 \`mood\` 或 \`title\` 触碰敏感词的任务。
3. **文案系统升级**：一旦检测到高压任务，立即提取其 \`title\` 并拦截原有的统计文案，替换为极具情绪关怀的：“✨ 今天有一件让你有些内耗的事（\${currentHighAnxietyTitle}），Jarvis 已自动为你屏蔽了非紧急的杂务提醒。别担心，陪你一起搞定它。”。无高压任务时则保留原有的温和文案兜底。

该修改是完全隔离的逻辑替换，不会影响其他组件的运行。
测试链接：http://127.0.0.1:5173/`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "本地 pnpm verify:answer 验证通过",
  "ArrangePage 页面渲染正常，测试了命中敏感词的逻辑",
  "页面已能在本地 dev server 访问: http://127.0.0.1:5173/"
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

console.log("Appended new log entry for energy guard");