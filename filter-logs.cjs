const fs = require('fs');

const tsFilePath = 'src/data/aiConversationLog.ts';
const mdFilePath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

let tsContent = fs.readFileSync(tsFilePath, 'utf-8');
const arrayMatch = tsContent.match(/export const aiConversationLogEntries: AiConversationLogEntry\[\] = (\[[\s\S]*\]);/);
let entries = new Function('return ' + arrayMatch[1])();
const originalCount = entries.length;

function shouldRemove(text) {
  const t = text.trim();
  if (t === '帮我启动' || t === '好的' || t === '运行一下' || t === '看看这个' || t === '收到') return true;
  if (t.includes('到这个能力界面直接全屏了，你要注意每个页面都要遵循模拟移动端尺寸')) return true;
  if (t.includes('还是没有改变啊，还是很慢识别，动画也没有')) return true;
  
  // Rule 2: 单纯的确认回复、测试反馈或没有技术含量的短消息
  if (t === '`AI识别失败: SyntaxError: Unexpected end of JSON input`') return true;
  if (t === '现在不报错了，但是ai识别还是没有跑通，到底为啥') return true;
  if (t === '`[AI识别] 未找到大括号包裹的 JSON 结构` 为啥没有后续了') return true;
  if (t === '现在把我的默认要求打包成一个提示词') return true;
  
  if (t.startsWith('提供了控制台日志，显示')) return true;
  if (t.startsWith('反馈正则提取依然失败')) return true;
  if (t.startsWith('反馈正则提取的 `title` 错误地抓取到了')) return true;
  if (t.startsWith('反馈通过截图和日志发现')) return true;
  if (t.startsWith('提供了包含 `reasoning_content`')) return true;
  if (t.includes('文案精简一点，直接显示xx条 即可')) return true;
  if (t.includes('把这一大段删除就行了。然后处理完之后跟我推到GitHub。')) return true;
  if (t.includes('红框的里边内容似乎也没必要？')) return true;

  return false;
}

const filtered = entries.filter(e => !shouldRemove(e.userInput));

let newTsContent = `export type AiConversationLogEntry = {
  timestamp: string;
  userInput: string;
  aiFinalOutput: string;
  changedFiles: string[];
  verification: string[];
};

export const aiConversationLogEntries: AiConversationLogEntry[] = [\n`;

filtered.forEach(entry => {
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

// Also update MD
let mdContent = fs.readFileSync(mdFilePath, 'utf-8');
const mdHeaderMatch = mdContent.match(/^([\s\S]*?)(?=## \d{4}-\d{2}-\d{2})/);
let newMdContent = mdHeaderMatch ? mdHeaderMatch[1] : '';

filtered.forEach(entry => {
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

console.log(`Original: ${originalCount}, Filtered: ${filtered.length}`);