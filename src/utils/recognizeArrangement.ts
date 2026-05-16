import { callAI, getAISettings } from '../data/aiSettings'
import { Arrangement, createArrangement, getArrangements, saveArrangements, ArrangementContext } from '../data/arrangements'

export interface RecognizeResult {
  hasArrangement: boolean
  confidence: 'high' | 'medium' | 'low'
  title?: string
  timeDescription?: string   // 原始时间描述，如"后天""下周三"
  startTimeISO?: string      // 解析后的ISO时间字符串，可能为空
  location?: string
  relatedPeople?: string[]
  note?: string
  rawResponse?: string
}

// 把相对时间描述转为具体时间戳
function parseRelativeTime(desc: string): number | undefined {
  if (!desc) return undefined
  const now = new Date()
  const lower = desc.toLowerCase()
  
  if (lower.includes('明天') || lower.includes('tomorrow')) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime()
  }
  if (lower.includes('后天')) {
    const d = new Date(now); d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); return d.getTime()
  }
  if (lower.includes('下周') || lower.includes('next week')) {
    const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d.getTime()
  }
  if (lower.includes('今天') || lower.includes('today')) {
    const d = new Date(now); d.setHours(18, 0, 0, 0); return d.getTime()
  }
  // 尝试直接解析ISO格式
  if (desc.match(/^\d{4}-\d{2}-\d{2}/)) {
    const t = new Date(desc).getTime()
    if (!isNaN(t)) return t
  }
  return undefined
}

export async function recognizeArrangementFromMessage(
  messageText: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _sourceLabel: string = '发给自己',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _sourceType: ArrangementContext['sourceType'] = 'self_message'
): Promise<RecognizeResult> {
  const settings = getAISettings()
  
  if (!settings.isEnabled || !settings.apiKey) {
    return { hasArrangement: false, confidence: 'low' }
  }

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const systemPrompt = `你是一个帮助用户识别消息中"安排"的助手。
"安排"是指用户未来需要做的事情，包括：待办、日程、计划、提醒、任务等。
今天是${today}。

你必须严格按照以下JSON格式回复，不要有任何其他内容：
{
  "hasArrangement": true或false,
  "confidence": "high"或"medium"或"low",
  "title": "安排的简洁标题，10字以内",
  "timeDescription": "原始时间描述，如后天、下周三、明天下午，没有则为空字符串",
  "startTimeISO": "ISO格式的具体时间，如2024-05-20T14:00:00，推算不出则为空字符串",
  "location": "地点，识别不到则为空字符串",
  "relatedPeople": ["相关人名数组，识别不到则为空数组"],
  "note": "补充说明，没有则为空字符串"
}

判断规则：
- 明确表达未来要做某事：hasArrangement=true，confidence=high
- 可能暗示要做某事但不确定：hasArrangement=true，confidence=medium  
- 只是普通聊天、感慨、陈述过去的事：hasArrangement=false
- 隐喻或暗语（如"～～"）：hasArrangement=false，不要猜测
- title要简洁，去掉时间地点，只保留核心动作，如"去医院复查"而不是"后天下午去医院复查"`

  try {
    const response = await callAI(
      settings,
      [{ role: 'user', content: `请分析这条消息是否包含安排：\n"${messageText}"` }],
      systemPrompt
    )

    // 清理响应，提取JSON
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as RecognizeResult
    
    // 如果AI给了timeDescription但没给startTimeISO，尝试本地解析
    if (parsed.timeDescription && !parsed.startTimeISO) {
      const localTime = parseRelativeTime(parsed.timeDescription)
      if (localTime) {
        parsed.startTimeISO = new Date(localTime).toISOString()
      }
    }

    return { ...parsed, rawResponse: response }
  } catch (e) {
    console.error('AI识别失败:', e)
    return { hasArrangement: false, confidence: 'low', rawResponse: String(e) }
  }
}

// 将识别结果转为Arrangement并保存
export function saveRecognizedArrangement(
  result: RecognizeResult,
  originalMessage: string,
  sourceLabel: string,
  sourceType: ArrangementContext['sourceType']
): Arrangement {
  const context: ArrangementContext = {
    id: `ctx_${Date.now()}`,
    sourceType,
    sourceLabel,
    snippet: originalMessage.slice(0, 100),
    timestamp: Date.now()
  }

  const startTime = result.startTimeISO ? new Date(result.startTimeISO).getTime() : undefined

  const arrangement = createArrangement({
    title: result.title || '未命名安排',
    note: result.note || undefined,
    timeType: startTime ? 'deadline' : 'none',
    startTime,
    source: sourceType,
    contexts: [context],
    relatedPeople: result.relatedPeople || [],
    location: result.location || undefined
  })

  const current = getArrangements()
  saveArrangements([...current, arrangement])
  return arrangement
}
