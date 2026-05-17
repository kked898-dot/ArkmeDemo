import { useEffect, useState } from 'react'
import { RecognizeResult } from '../utils/recognizeArrangement'

interface Props {
  result: RecognizeResult
  originalMessage: string
  onConfirm: () => void
  onDismiss: () => void
}

export default function ArrangementRecognizeToast({ result, originalMessage, onConfirm, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
  }, [])

  const confidenceText = {
    high: '我注意到你提到了一件事，要记下来吗？',
    medium: '这条消息里好像有什么安排？你看一下',
    low: '这条消息可能包含一个安排，确认一下？'
  }[result.confidence || 'high']

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 300,
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 300ms ease'
    }}>
      <div style={{
        background: '#FAFAF8',
        borderRadius: '16px 16px 0 0',
        padding: '20px 16px 32px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)'
      }}>
        {/* 提示文案 */}
        <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>
          {confidenceText}
        </div>

        {/* 识别结果卡片 */}
        <div style={{
          background: '#f8f8f8',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>
            {result.title}
          </div>
          <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.6 }}>
            {result.timeDescription && <span>🕐 {result.timeDescription} </span>}
            {result.location && <span>📍 {result.location} </span>}
            {result.relatedPeople && result.relatedPeople.length > 0 && (
              <span>👥 {result.relatedPeople.join('、')}</span>
            )}
          </div>
          {result.note && (
            <div style={{ fontSize: '12px', color: '#bbb', marginTop: '6px' }}>
              {result.note}
            </div>
          )}
        </div>

        {/* 原始消息 */}
        <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '16px', fontStyle: 'italic' }}>
          来自："{originalMessage.slice(0, 40)}{originalMessage.length > 40 ? '...' : ''}"
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              border: 'none', background: '#f5f5f5',
              fontSize: '15px', color: '#999', cursor: 'pointer'
            }}
          >
            不用了
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              border: 'none', background: '#1a1a1a',
              fontSize: '15px', fontWeight: 500, color: '#fff', cursor: 'pointer'
            }}
          >
            记下来
          </button>
        </div>
      </div>
    </div>
  )
}
