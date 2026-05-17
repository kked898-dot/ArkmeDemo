const fs = require('fs');

const tsPath = 'src/data/aiConversationLog.ts';
const mdPath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

const timestamp = "2026-05-17 13:55:00 CST (+0800)";
const userInput = `请注意，目前「能量护盾」的顶部拦截逻辑不够智能：如果今天同时存在多个高压任务（如“扫墓”和“开会”），系统没有进行权重排序，导致它在顶部错误地去纠结低焦虑的“开会”，而忽略了更重大的事件。

请聚焦并精准重构 src/pages/ArrangePage.tsx 中的 getTodaySummary 函数，绝不做无关重构：

【1. 引入严格的时间轴校验】
- 必须只筛选出【今天/近期】且 status === 'pending' 的安排，确保已经过去或属于昨天的超期任务不抢占今天的核心注意力（比如画面中的“开会”其实是昨天超期的事情，不应该作为今天的焦点）。

【2. 建立高压情绪权重矩阵（Priority Matrix）】
在函数内部，为关键词和心情赋予明确的焦虑权重分数（分数越高，代表心理负荷越重）：
const ANXIETY_WEIGHTS: Record<string, number> = {
  '扫墓': 100,
  '祭祖': 100,
  '医院': 90,
  '体检': 90,
  '复查': 85,
  '面试': 80,
  '考试': 75,
  '开会': 40, // 开会属于日常低权重事务
};

【3. 智能加权排序算法】
- 遍历今天所有 pending 的安排项。
- 写一个评分函数：检查 arrangement.title 或 arrangement.mood。如果命中了权重矩阵里的 key，则将该安排赋予对应的分值（未命中则为 0）。
- 对这些安排按【分值从高到低】进行严格排序（Sort descending）。
- 取出分值最高（也就是最让用户内耗、最需要保护）的那一条安排作为今天的「核心护盾阻击点」。

【4. 动态输出文案】
- 如果最高分值的安排分值 > 0：
  则将顶部文案动态重组为：
  “✨ 今天有一件让你有些内耗的事（\${最高分任务.title}），Jarvis 已自动为你屏蔽了非紧急的杂务提醒。别担心，陪你一起搞定它。”
- 如果没有高压任务，恢复之前的常规数字概览或兜底。`;

const aiFinalOutput = `已精准重构 \`getTodaySummary\` 函数，引入了智能的“能量护盾”排序拦截算法：
1. **严格时间轴校验**：限制在 \`startOfToday\` 和 \`endOfToday\` 之间，彻底排除了属于昨天超期任务抢占今天注意力的可能。
2. **高压情绪权重矩阵**：引入 \`ANXIETY_WEIGHTS\` 字典，对不同敏感词赋予了不同量级的心理负荷权重（如扫墓100、医院90、开会40）。
3. **智能加权排序**：将 \`todayArrangements\` 映射计算 \`_anxietyScore\`，严格进行 \`b._anxietyScore - a._anxietyScore\` 降序排列，确保护盾只会锁定最让用户内耗的单点任务。
4. **动态文案输出**：在最高分大于0时，安全提取其标题并输出“内耗屏蔽”的专属产品文案；否则正常 fallback 到日常温和提示。
无任何外部组件逻辑破坏，编译正常。
测试链接：http://127.0.0.1:5173/`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "本地 pnpm verify:answer 验证通过",
  "ArrangePage.tsx 页面在开发服务器下无报错，能正常拦截高权重任务",
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

console.log("Appended new log entry for intelligent energy guard");