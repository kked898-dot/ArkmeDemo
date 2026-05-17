import { useState } from 'react'
import { AISettings, getAISettings, saveAISettings, PROVIDER_DEFAULTS, testAIConnection } from '../data/aiSettings'

interface Props {
  onBack: () => void
}

export default function AISettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<AISettings>(getAISettings)
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setSaved(false)
    setTestStatus('idle')
    setTestMessage('')
  }

  const handleProviderChange = (provider: AISettings['provider']) => {
    const defaults = PROVIDER_DEFAULTS[provider]
    update({
      provider,
      baseURL: defaults.baseURL,
      model: defaults.modelSuggestions[0] || ''
    })
  }

  const handleSave = () => {
    saveAISettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    handleSave() // 测试前先保存
    setTestStatus('testing')
    setTestMessage('')
    const result = await testAIConnection(settings)
    setTestStatus(result.success ? 'success' : 'fail')
    setTestMessage(result.message)
  }

  const providers = [
    { value: 'openai' as const, label: 'OpenAI' },
    { value: 'anthropic' as const, label: 'Anthropic' },
    { value: 'other' as const, label: '其他' },
  ]

  const currentDefaults = PROVIDER_DEFAULTS[settings.provider] || PROVIDER_DEFAULTS['other']
  
  const capsuleStyle = (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer' as const,
    background: active ? '#1a1a1a' : '#f0f0f0',
    color: active ? '#fff' : '#888',
    transition: 'all 200ms',
    whiteSpace: 'nowrap' as const
  })

  const sectionLabel = {
    fontSize: '12px' as const,
    color: '#bbb',
    marginBottom: '10px',
    display: 'block' as const
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: '#f8f8f8',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#1a1a1a',
    boxSizing: 'border-box' as const,
    outline: 'none'
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* 顶部导航 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '15px', color: '#1a1a1a', cursor: 'pointer', padding: '4px 0' }}>
          ← 返回
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>AI 能力</span>
        <button onClick={handleSave} style={{ background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: saved ? '#4CAF50' : '#1a1a1a', cursor: 'pointer' }}>
          {saved ? '已保存 ✓' : '保存'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>

        {/* 说明 */}
        <div style={{ padding: '14px 16px 4px', fontSize: '13px', color: '#bbb', lineHeight: 1.6 }}>
          AI 识别会消耗你自己的 Token。API Key 只存储在本设备，不会上传。
        </div>

        {/* 服务商 */}
        <div style={{ padding: '16px 16px 8px' }}>
          <span style={sectionLabel}>服务商</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {providers.map(p => (
              <button key={p.value} onClick={() => handleProviderChange(p.value)} style={capsuleStyle(settings.provider === p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div style={{ padding: '8px 16px' }}>
          <span style={sectionLabel}>API Key</span>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => update({ apiKey: e.target.value })}
              placeholder="粘贴你的 API Key"
              style={{ ...inputStyle, paddingRight: '56px' }}
            />
            <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '13px' }}>
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        {/* API 地址 */}
        <div style={{ padding: '8px 16px' }}>
          <span style={sectionLabel}>API 地址（支持代理或国内镜像）</span>
          <input
            type="text"
            value={settings.baseURL}
            onChange={e => update({ baseURL: e.target.value })}
            placeholder="API 接口地址"
            style={inputStyle}
          />
        </div>

        {/* 模型 */}
        <div style={{ padding: '8px 16px' }}>
          <span style={sectionLabel}>模型</span>
          {currentDefaults.modelSuggestions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {currentDefaults.modelSuggestions.map(m => (
                <button key={m} onClick={() => update({ model: m })} style={capsuleStyle(settings.model === m)}>
                  {m}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={settings.model}
            onChange={e => update({ model: e.target.value })}
            placeholder={currentDefaults.modelPlaceholder}
            style={inputStyle}
          />
          <div style={{ fontSize: '12px', color: '#ccc', marginTop: '6px' }}>
            也可以直接输入任意模型名称
          </div>
        </div>

        {/* 测试连接 */}
        <div style={{ padding: '8px 16px' }}>
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            style={{
              width: '100%', padding: '13px',
              borderRadius: '10px',
              border: '1px solid #e8e8e8',
              background: '#fff',
              fontSize: '14px',
              color: testStatus === 'success' ? '#4CAF50' : testStatus === 'fail' ? '#ff6b6b' : '#666',
              cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer'
            }}
          >
            {testStatus === 'testing' ? '连接中...' : '测试连接'}
          </button>
          {testMessage && (
            <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px', color: testStatus === 'success' ? '#4CAF50' : '#ff6b6b' }}>
              {testMessage}
            </div>
          )}
        </div>

        {/* 启用开关 */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f5f5f5', marginTop: '8px' }}>
          <div>
            <div style={{ fontSize: '15px', color: '#1a1a1a' }}>启用 AI 识别</div>
            <div style={{ fontSize: '12px', color: '#bbb', marginTop: '3px' }}>开启后可从消息中自动识别安排</div>
          </div>
          <button
            onClick={() => update({ isEnabled: !settings.isEnabled })}
            style={{ width: '48px', height: '28px', borderRadius: '14px', border: 'none', background: settings.isEnabled ? '#1a1a1a' : '#e0e0e0', position: 'relative', cursor: 'pointer', transition: 'background 200ms', flexShrink: 0 }}
          >
            <span style={{ position: 'absolute', top: '3px', left: settings.isEnabled ? '23px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left 200ms', display: 'block' }} />
          </button>
        </div>

      </div>
    </div>
  )
}
