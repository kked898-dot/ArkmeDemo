const fs = require('fs');

const tsPath = 'src/data/aiConversationLog.ts';
const mdPath = 'docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md';

const timestamp = "2026-05-17 13:40:00 CST (+0800)";
const userInput = `现在我们需要彻底重构“安排详情页”中的“关联记忆”区域，将其升级为具有复古拍立得质感和人文温度的“记忆溯源（Memory Slice）”模块。

请在 src/pages/ArrangePage.tsx 中找到之前添加的 context 渲染代码，将其精准替换为以下设计：

【1. 视觉容器重构（The Container）】
- 外层包裹容器去掉硬边框，整体微微向左倾斜（如 rotate-[-0.8deg]）。这传递了一种“把一张纸质相片随手放在桌面上”的克制感。
- 整个模块加上一个极其柔和、弥散的大阴影（shadow-[0_8px_30px_rgb(0,0,0,0.04)]）。

【2. 标题区域：数字指示灯】
- 模块标题：使用淡雅的文本颜色（text-[#8F8C84]），文字改为“💭 记忆片刻 (Memory Slice)”。
- 左侧的小圆形指示灯，从绿色改为呼吸式的、温暖的日落琥珀色（bg-[#D9A06F]），暗示 AI 正在轻轻守护这段记忆，且加上呼吸动效（animate-pulse）。

【3. 仿真底片卡片（The Polaroid）】
- 卡片背景色改为极淡的复古奶油色（bg-[#FAF9F6]），配合极细的温和边框（border-[#E8E6DF]）和中等圆角（rounded-xl）。
- 卡片底部留出一段较宽的“相片空白区”用于放置元数据（metadata）。

【4. 聊天气泡：克制与人话】
- 复刻原生聊天样式。左侧头像“我”保留，但字体颜色改柔和（text-[#666]）。
- 聊天文本气泡：背景色改为极淡的莫兰迪灰调（bg-[#EEEDE9]），行高（leading-relaxed）设置高可读性，字体颜色克制（text-[#333]）。
- 卡片底部宽留白区（元数据）：
    - 左侧加一行打字机字体的标签（font-mono text-[10px] text-[#A09D96]），文案改为：“记录于此 (RECORDED_IN)”
    - 右侧显示时间戳，格式化为更具人文气息的复古打字机风格，如：MAY 17, 17:59:12。

【5. 复古徽章传送按钮（The clever touch）】
- 在卡片右下角，设计一个绝对定位的、不带背景色的圆形戳印按钮（border-2 border-[#D1CEC8]）。
- 按钮内部放一个极小的、复古样式的回形针图标或圆形小箭头（SVG 绘制）。
- 【小巧思】：当用户悬停在按钮上（Hover）时：
    - 按钮平滑旋转 18 度的角度（transition-transform hover:rotate-[18deg]）。
    - 按钮下方平滑出现一行淡淡的提示文案（absolute bottom-[-16px]）：*“陪你回到现场...”*（font-serif text-[10px] italic text-[#B4B1AB]）。

【6. 传送动作闭环】
- 点击该“圆形徽章”时，除了安全触发对应的 Props 回调（onTeleportToSelf 或 onTeleportToTestChat）外，请务必找出当前页面中用于关闭详情弹窗的状态设置函数（例如 setSelectedArrangement(null) 或 setIsDetailOpen(false) 等），在跳转的同时让详情页顺滑消失。`;

const aiFinalOutput = `已彻底重构“关联记忆”区域为复古拍立得风格的“记忆片刻（Memory Slice）”模块，具体改动如下：
1. **视觉容器**：包裹容器添加 \`rotate-[-0.8deg]\` 与弥散大阴影 \`shadow-[0_8px_30px_rgb(0,0,0,0.04)]\`，模拟随手放在桌面的纸片感。
2. **标题区域**：将指示灯改为温暖的日落琥珀色 \`bg-[#D9A06F]\`（带 \`animate-pulse\`），标题文本改为 \`text-[#8F8C84]\` 的“💭 记忆片刻 (Memory Slice)”。
3. **仿真底片卡片**：背景使用复古奶油色 \`bg-[#FAF9F6]\` 和温和边框 \`border-[#E8E6DF]\`，设置 \`rounded-xl\` 中等圆角，并为底部预留宽白区。
4. **聊天气泡**：重置气泡样式为极淡莫兰迪灰调 \`bg-[#EEEDE9]\`，底部元数据左侧展示 \`记录于此 (RECORDED_IN)\`，右侧利用 JS 处理展示 \`MAY 17, 17:59:12\` 格式的打字机风格时间。
5. **复古徽章按钮**：右下角绝对定位的无背景圆形戳印按钮，内嵌回形针 SVG。加入了悬停 \`hover:rotate-[18deg]\` 动效及淡出的提示文案“陪你回到现场...”。
6. **交互闭环**：触发回溯时同时调用了 \`handleClose()\` 以关闭安排详情弹窗。
测试链接：http://127.0.0.1:5173/`;

const changedFiles = [
  "src/pages/ArrangePage.tsx",
  "src/data/aiConversationLog.ts",
  "docs/codex-logs/candidate-tison-tison-20260515-120159-0f93e8.md"
];

const verification = [
  "本地 pnpm verify:answer 验证通过",
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

console.log("Appended new log entry for memory slice");