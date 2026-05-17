const fs = require('fs');

const tsPath = 'src/data/aiConversationLog.ts';
const mdPath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

const timestamp = "2026-05-17 14:00:00 CST (+0800)";
const userInput = `现在的 getTodaySummary 逻辑依然没有正确识别“扫墓”的最高权重，文案还是卡在“明天开会”上。这是因为时间过滤或权重排序的逻辑有漏洞。

请精准且安全地重构 src/pages/ArrangePage.tsx 中的 getTodaySummary 函数，用以下最严密的逻辑彻底替代它：

【1. 扩大护盾感知的时空视界（24小时前瞻）】
不要严格限制在当天的 00:00-24:00。只要是状态为 status === 'pending'，且其任务时间属于【今天、明天、或超期未完成（Overdue）】的安排，全部拉入判定池！因为明天的重度任务（如扫墓、面试）在今晚就已经开始给用户带来心理内耗了。

【2. 严密的权重评分算法】
在函数内部，精确实现这个加权和过滤逻辑：
\`\`\`typescript
const ANXIETY_WEIGHTS: Record<string, number> = {
  '扫墓': 100,
  '祭祖': 100,
  '医院': 90,
  '体检': 90,
  '复查': 85,
  '面试': 80,
  '考试': 75,
  '开会': 40
};

// 1. 过滤近期值得关注的待办
const relevantArrangements = arrangements.filter(a => a.status === 'pending');

// 2. 映射并计算每条安排的心理负荷得分
const scoredItems = relevantArrangements.map(item => {
  let score = 0;
  
  // 检查标题是否命中关键词
  Object.keys(ANXIETY_WEIGHTS).forEach(key => {
    if (item.title && item.title.includes(key)) {
      score = Math.max(score, ANXIETY_WEIGHTS[key]);
    }
  });
  
  // 检查心情（mood）是否命中焦虑词
  const anxietyMoods = ['焦虑', '抗拒', '疲惫', '心累', '紧张', '害怕'];
  if (item.mood) {
    anxietyMoods.forEach(moodWord => {
      if (item.mood.includes(moodWord)) {
        score = Math.max(score, 85); // 命中焦虑心情直接给高基础分
      }
    });
  }
  
  return { item, score };
});

// 3. 按分值从高到低排序，分值相同按创建时间倒序
scoredItems.sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt);
\`\`\`
`;

const aiFinalOutput = `已彻底重构 \`getTodaySummary\` 函数，修复了最高权重识别不准的漏洞。
1. **扩大了感知的时空视界**：解除了之前对当天 00:00-24:00 的严格限制，现在将所有的 \`pending\` 任务均拉入高压判定池，以便提前一两天就开始对高焦虑任务（如“扫墓”）进行护盾防护。
2. **严密的权重评分与双重检验**：通过 \`Object.keys(ANXIETY_WEIGHTS).forEach\` 以及 \`Math.max\` 精准给每一个 \`item\` 打分，并且针对 \`mood\` 设置了 85 的高基础分。
3. **稳健的排序算法**：通过 \`scoredItems.sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt)\` 进行严格降序排列。
4. **兜底文案安全恢复**：若未触发高压任务，依然在底部使用 \`startOfToday\` 进行传统的“今天有X件事”统计，确保常规逻辑不被破坏。
测试链接：http://127.0.0.1:5173/`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "本地 pnpm verify:answer 验证通过",
  "确保 ArrangePage 中顶部文案能够正确越过日常杂务识别到超高权重的待办",
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

console.log("Appended new log entry for bulletproof energy guard");