const fs = require('fs');
const tsContent = fs.readFileSync('src/data/aiConversationLog.ts', 'utf-8');
const arrayMatch = tsContent.match(/export const aiConversationLogEntries: AiConversationLogEntry\[\] = (\[[\s\S]*\]);/);
const entries = new Function('return ' + arrayMatch[1])();
entries.forEach((e, i) => console.log(i + ': ' + e.userInput.slice(0, 100).replace(/\n/g, ' ')));