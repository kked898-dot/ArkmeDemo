export interface AISettings {
  provider: 'openai' | 'anthropic' | 'other'
  apiKey: string
  baseURL: string        // 新增：API地址，支持自定义
  model: string          // 完全自由输入，不再写死
  isEnabled: boolean
}

const STORAGE_KEY = 'ai_settings'

// 各服务商的默认baseURL，仅作为预填提示
export const PROVIDER_DEFAULTS: Record<AISettings['provider'], { baseURL: string; modelPlaceholder: string; modelSuggestions: string[] }> = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    modelPlaceholder: '例如：gpt-4o、gpt-4o-mini',
    modelSuggestions: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com',
    modelPlaceholder: '例如：claude-sonnet-4-20250514',
    modelSuggestions: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001']
  },
  other: {
    baseURL: '',
    modelPlaceholder: '输入你的模型名称',
    modelSuggestions: []
  }
}

export function getAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 兼容旧版本没有baseURL字段的情况
      if (!parsed.baseURL) {
        parsed.baseURL = PROVIDER_DEFAULTS[parsed.provider as AISettings['provider']]?.baseURL || ''
      }
      return parsed
    }
  } catch {
    // ignore
  }
  return {
    provider: 'openai',
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    isEnabled: false
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// 发起 AI 请求（支持多轮对话格式）
export async function callAI(
  settings: AISettings,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt?: string,
  options?: { max_tokens?: number }
): Promise<string> {
  if (!settings.apiKey.trim()) throw new Error('未配置 API Key')
  if (!settings.model.trim()) throw new Error('未配置模型名称')
  if (!settings.isEnabled) throw new Error('AI 识别未启用')

  const baseURL = settings.baseURL.replace(/\/$/, '')

  // Anthropic 用自己的格式
  if (settings.provider === 'anthropic') {
    const res = await fetch(`${baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: options?.max_tokens || 1000,
        system: systemPrompt || '',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let err
      try { err = JSON.parse(errText) } catch { /* ignore */ }
      throw new Error(err?.error?.message || `请求失败 ${res.status}: ${errText}`)
    }
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error(`Anthropic API 返回了无效的 JSON: ${text}`)
    }
    return data.content?.[0]?.text || ''
  }

  // 其他服务商统一走 OpenAI 兼容格式（/chat/completions）
  const endpoint = `${baseURL}/chat/completions`
  const body: Record<string, unknown> = {
    model: settings.model,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
    max_tokens: options?.max_tokens || 1000,
    temperature: 0
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let err
    try { err = JSON.parse(errText) } catch { /* ignore */ }
    throw new Error(err?.error?.message || `请求失败 ${res.status}: ${errText}`)
  }

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error(`API 返回了无效的 JSON: ${text}`)
  }
  console.log('[callAI] API 完整解析结果:', data)
  
  // 尝试提取标准 content，如果为空但存在 reasoning_content（部分国产推理模型特性），则使用 reasoning_content
  let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || ''
  if (!content && data.choices?.[0]?.message?.reasoning_content) {
    content = data.choices[0].message.reasoning_content
  }
  
  if (!content) {
    console.warn('[callAI] 警告：未能从返回体中提取到 content。返回内容为:', text)
  }
  return content
}

// 测试连接：发一条最简单的消息验证
export async function testAIConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
  if (!settings.apiKey.trim()) return { success: false, message: '请先输入 API Key' }
  if (!settings.model.trim()) return { success: false, message: '请先输入模型名称' }
  if (!settings.baseURL.trim()) return { success: false, message: '请先填写 API 地址' }

  try {
    const result = await callAI(
      { ...settings, isEnabled: true },
      [{ role: 'user', content: '你好，请回复"ok"' }]
    )
    if (result) return { success: true, message: '连上了，可以使用 ✓' }
    return { success: false, message: '有响应但内容为空，请检查模型名称' }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '未知错误'
    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid_api_key')) {
      return { success: false, message: 'API Key 不对，检查一下' }
    }
    if (msg.includes('404') || msg.includes('model')) {
      return { success: false, message: '模型名称可能有误，检查一下' }
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return { success: false, message: '网络异常，或 API 地址不对' }
    }
    return { success: false, message: msg }
  }
}
