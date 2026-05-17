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

【重要】请直接输出最终的 JSON 结果，不要输出任何分析过程、思考过程、解释说明或 markdown 标记。
你的整个回复必须是一个合法的 JSON 对象。

严格遵循以下 JSON 格式：
{
  "hasArrangement": true或false,
  "confidence": "high"或"medium"或"low",
  "title": "（实际的安排标题，例如：去医院复查）",
  "timeDescription": "（实际的时间描述，例如：明天下午）",
  "startTimeISO": "（实际的ISO时间，例如：2024-05-20T14:00:00）",
  "location": "（实际地点）",
  "relatedPeople": [],
  "note": "（实际备注）"
}

判断规则：
- 明确表达未来要做某事：hasArrangement=true，confidence=high
- 可能暗示要做某事但不确定：hasArrangement=true，confidence=medium  
- 只是普通聊天、感慨、陈述过去的事：hasArrangement=false
- 隐喻或暗语（如"～～"）：hasArrangement=false，不要猜测
- title要简洁，去掉时间地点，只保留核心动作`

  try {
    console.log('[AI识别] 开始请求 AI，消息:', messageText)
    const response = await callAI(
      settings,
      [{ role: 'user', content: `请分析这条消息是否包含安排：\n"${messageText}"` }],
      systemPrompt,
      { max_tokens: 1500 }
    )
    console.log('[AI识别] AI 原始返回:', response)

    // 清理响应，提取JSON
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: RecognizeResult
    try {
      // 尝试提取完整JSON，即使响应被截断
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('[AI识别] 未找到成对大括号包裹的 JSON 结构，将进入正则兜底提取')
        throw new Error('No valid JSON braces found')
      }
      parsed = JSON.parse(jsonMatch[0]) as RecognizeResult
      console.log('[AI识别] JSON 解析成功:', parsed)
    } catch (e) {
      console.warn('[AI识别] JSON 解析失败，尝试正则提取。错误:', e)
      // JSON不完整，尝试用正则提取关键字段
      // 注意：为了防止匹配到 systemPrompt 中的示例说明，我们需要从后往前匹配，
      // 或者确保提取的是位于 JSON 结构中的实际值。
      
      // 兼容有无引号、空格等情况
      const hasArrRegex = /"?hasArrangement"?\s*[:=]\s*true/g
      let hasArrMatch = false
      while (hasArrRegex.exec(cleaned) !== null) {
        hasArrMatch = true
      }
      
      if (!hasArrMatch) {
        console.warn('[AI识别] 正则未匹配到 hasArrangement: true')
        return { hasArrangement: false, confidence: 'low' }
      }
      
      // 使用全局匹配找出所有匹配项，然后取最后一个（通常是模型生成的真实结果，而不是 prompt 中的提示）
      const titleRegex = /"?title"?\s*:\s*"([^"]+)"/g
      let titleMatch = null
      let match
      while ((match = titleRegex.exec(cleaned)) !== null) {
        titleMatch = match
      }
      
      const timeRegex = /"timeDescription":\s*"([^"]*)"/g
      let timeMatch = null
      while ((match = timeRegex.exec(cleaned)) !== null) {
        timeMatch = match
      }

      parsed = {
        hasArrangement: true,
        confidence: 'medium',
        title: titleMatch ? titleMatch[1] : '未命名安排',
        timeDescription: timeMatch ? timeMatch[1] : '',
      }
      console.log('[AI识别] 正则提取成功:', parsed)
    }
    
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
  sourceType: ArrangementContext['sourceType'],
  messageId?: string
): Arrangement {
  const context: ArrangementContext = {
    id: `ctx_${Date.now()}`,
    sourceType,
    sourceLabel,
    snippet: originalMessage.slice(0, 100),
    timestamp: Date.now(),
    conversationId: sourceType === 'self_message' ? 'send-to-self' : undefined,
    messageId
  }

  const startTime = result.startTimeISO ? new Date(result.startTimeISO).getTime() : undefined

  const hasReminder = result.note?.includes('提醒') || 
                      result.timeDescription?.includes('提醒') ||
                      result.title?.includes('提醒')

  const arrangement = createArrangement({
    title: result.title || '未命名安排',
    note: result.note || undefined,
    timeType: hasReminder ? 'reminder' : (startTime ? 'deadline' : 'none'),
    remindAt: hasReminder ? startTime : undefined,
    startTime: hasReminder ? undefined : startTime,
    source: sourceType,
    contexts: [context],
    relatedPeople: result.relatedPeople || [],
    location: result.location || undefined
  })

  const current = getArrangements()
  saveArrangements([...current, arrangement])
  return arrangement
}
