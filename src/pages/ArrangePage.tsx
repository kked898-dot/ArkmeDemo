import React, { useState, useEffect, useRef } from 'react';
import {
  Arrangement,
  ArrangementTimeType,
  ArrangementExecutor,
  ArrangementContext,
  getArrangements,
  saveArrangements,
  updateArrangement,
  deleteArrangement,
  isOverdue,
  getDaysOverdue,
  createArrangement,
} from '../data/arrangements';
import { getAISettings, callAI } from '../data/aiSettings';
import { saveRecognizedArrangement } from '../utils/recognizeArrangement';

const COLORS = {
  pageBg: '#F2F0EB',        // 旧纸色，页面背景
  cardBg: '#FAFAF8',        // 微暖白，卡片背景
  cardBgDone: '#F5F5F2',    // 已完成卡片，更暗淡
  textPrimary: '#1C1C1A',   // 主文字，接近黑但不纯黑
  textSecondary: '#8A8880',  // 次要信息
  textTertiary: '#C4C2BC',  // 最浅，分区标签、搁置文字
  accent: '#1C1C1A',        // 强调色同主文字
  divider: '#E8E6E0',       // 分隔线
  doneStrike: '#BCBAB4',    // 划掉线的颜色
  snoozedBg: '#F0EEE9',     // 搁置卡片背景
};

const fontStyle = `
  .arrange-title {
    font-family: 'Georgia', 'Songti SC', 'STSong', 'SimSun', serif;
  }
  .arrange-meta {
    font-family: -apple-system, 'PingFang SC', sans-serif;
  }
  .arrange-section-label {
    font-family: 'Georgia', 'Songti SC', 'STSong', serif;
    font-style: italic;
  }
  .arrange-summary {
    font-family: 'Georgia', 'Songti SC', 'STSong', serif;
    font-style: italic;
  }
  @keyframes dotBounce {
    0%, 60%, 100% { transform: translateY(0) }
    30% { transform: translateY(-6px) }
  }
  @keyframes lineFadeIn {
    0%, 100% { opacity: 0.3 }
    50% { opacity: 1 }
  }
  .ai-input::placeholder {
    color: #C4C2BC;
  }
`;

// ---------------------------
// 辅助函数
// ---------------------------
function getTodaySummary(arrangements: Arrangement[]): string {
  const pendingArrangements = arrangements.filter((a) => a.status === 'pending');

  if (pendingArrangements.length === 0) {
    return '今天没有安排，好好休息';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

  const todayArrangements = pendingArrangements.filter((a) => {
    if (!a.startTime) return false;
    return a.startTime >= startOfToday && a.startTime <= endOfToday;
  });

  if (todayArrangements.length === 0) {
    return '有些事情等着你，不用着急';
  } else if (todayArrangements.length === 1) {
    return '今天有 1 件事，不急慢慢来';
  } else {
    return `今天有 ${todayArrangements.length} 件事，一件一件来`;
  }
}

function getOverdueText(arrangement: Arrangement): string {
  const days = getDaysOverdue(arrangement);
  if (days <= 1) {
    return '昨天的事，还没来得及';
  }
  if (days <= 3) {
    return `原定${days}天前，还没来得及`;
  }
  return '放着有一阵子了，要处理一下吗';
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${m}-${d} ${h}:${min}`;
}

// ---------------------------
// 卡片组件
// ---------------------------
interface ArrangementCardProps {
  arrangement: Arrangement;
  onRefresh: () => void;
  onClick: (arrangement: Arrangement) => void;
  readOnly?: boolean;
}

function ArrangementCard({ arrangement, onRefresh, onClick, readOnly = false }: ArrangementCardProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [exitAnimation, setExitAnimation] = useState<'none' | 'done' | 'snoozed'>('none');
  const [strikeWidth, setStrikeWidth] = useState(false);

  const overdue = isOverdue(arrangement);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (readOnly) return;
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (readOnly || startX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (diff > 0) {
      setTranslateX(diff > 120 ? 120 : diff); // 限制最大滑动距离
    }
  };

  const handleTouchEnd = () => {
    if (readOnly) return;
    if (translateX > 60) {
      setShowActions(true);
    } else {
      setShowActions(false);
    }
    setTranslateX(0);
    setStartX(null);
  };

  const handleDone = () => {
    setStrikeWidth(true);
    setTimeout(() => {
      setExitAnimation('done');
    }, 300);
    setTimeout(() => {
      updateArrangement(arrangement.id, { status: 'done' });
      onRefresh();
    }, 600);
  };

  const handleSnooze = () => {
    setExitAnimation('snoozed');
    setTimeout(() => {
      updateArrangement(arrangement.id, { status: 'snoozed' });
      onRefresh();
    }, 450);
  };

  // 构建元数据文本
  const metaParts: string[] = [];
  if (overdue) {
    metaParts.push(getOverdueText(arrangement));
  } else if (arrangement.startTime) {
    metaParts.push(formatTime(arrangement.startTime));
  }
  if (arrangement.location) metaParts.push(arrangement.location);
  if (arrangement.relatedPeople && arrangement.relatedPeople.length > 0) {
    metaParts.push(arrangement.relatedPeople.join(', '));
  }
  const metaText = metaParts.join('  ');

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: '8px',
      maxHeight: exitAnimation !== 'none' ? '0px' : '120px',
      marginBottom: exitAnimation !== 'none' ? '0px' : '10px',
      opacity: exitAnimation !== 'none' ? 0 : 1,
      transform: exitAnimation === 'snoozed' ? 'translateX(20px) rotate(1.5deg)' : 'none',
      transition: exitAnimation === 'done' ? 'opacity 200ms ease, max-height 300ms ease 100ms, margin-bottom 300ms ease 100ms' : exitAnimation === 'snoozed' ? 'all 450ms cubic-bezier(0.4, 0, 0.6, 1)' : 'none',
    }}>
      {/* 背景操作区 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '8px',
          background: '#f5f5f5',
          opacity: showActions ? 1 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: showActions ? 'auto' : 'none',
        }}
      >
        <button
          onClick={handleDone}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          ✓ 做到了
        </button>
        <button
          onClick={handleSnooze}
          style={{
            background: '#E0E0E0',
            color: '#666',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          · · ·
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowActions(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#999',
            fontSize: '13px',
            padding: '6px',
          }}
        >
          取消
        </button>
      </div>

      {/* 前景卡片区 */}
      <div
        onClick={() => {
          if (!showActions) {
            onClick(arrangement);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: arrangement.status === 'snoozed' ? COLORS.snoozedBg : (arrangement.status === 'done' || arrangement.status === 'auto_done') ? COLORS.cardBgDone : COLORS.cardBg,
          borderRadius: '8px',
          padding: '14px 16px',
          opacity: (arrangement.status === 'snoozed' || arrangement.status === 'done' || arrangement.status === 'auto_done') ? (arrangement.status === 'snoozed' ? 0.7 : 0.5) : (readOnly ? 0.4 : overdue ? 0.55 : 1),
          transform: `translateX(${showActions ? 160 : translateX}px)`,
          transition: startX === null ? 'transform 0.2s' : 'none',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
          <div className="arrange-title" style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: arrangement.status === 'snoozed' ? COLORS.textSecondary : COLORS.textPrimary,
            letterSpacing: '0.2px',
            lineHeight: 1.4
          }}>
            {arrangement.title}
          </div>
          <div style={{
            position: 'absolute',
            left: 0,
            top: '52%',
            transform: 'translateY(-50%)',
            height: '2px',
            borderRadius: '1px',
            width: (strikeWidth || arrangement.status === 'done' || arrangement.status === 'auto_done') ? '100%' : '0%',
            background: strikeWidth ? '#8A8880' : ((arrangement.status === 'done' || arrangement.status === 'auto_done') ? '#BCBAB4' : COLORS.doneStrike),
            transition: 'width 400ms ease',
            pointerEvents: 'none'
          }} />
        </div>
        {metaText && (
          <div className="arrange-meta" style={{ fontSize: '12px', color: COLORS.textSecondary, fontStyle: 'italic', marginTop: '5px' }}>
            {metaText}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------
// 创建弹窗组件
// ---------------------------
interface CreateArrangementModalProps {
  show: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function CreateArrangementModal({ show, onClose, onRefresh }: CreateArrangementModalProps) {
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftMood, setDraftMood] = useState('');
  const [draftTimeType, setDraftTimeType] = useState<ArrangementTimeType>('none');
  const [draftStartTime, setDraftStartTime] = useState('');
  const [draftEndTime, setDraftEndTime] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftRelatedPeople, setDraftRelatedPeople] = useState('');
  const [draftExecutor, setDraftExecutor] = useState<ArrangementExecutor>('user_only');
  const [showExtraFields, setShowExtraFields] = useState(false);
  
  const [titleError, setTitleError] = useState(false);

  // 当弹窗打开时，自动聚焦标题输入框
  const titleInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (show && titleInputRef.current) {
      // 延迟一点聚焦，等待动画完成
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 300);
    }
  }, [show]);

  const resetDraft = () => {
    setDraftTitle('');
    setDraftNote('');
    setDraftMood('');
    setDraftTimeType('none');
    setDraftStartTime('');
    setDraftEndTime('');
    setDraftLocation('');
    setDraftRelatedPeople('');
    setDraftExecutor('user_only');
    setShowExtraFields(false);
    setTitleError(false);
  };

  const handleClose = () => {
    onClose();
    // 延迟重置状态，等待滑出动画完成
    setTimeout(resetDraft, 300);
  };

  const handleComplete = () => {
    const title = draftTitle.trim();
    if (!title) {
      setTitleError(true);
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    const newArrangement = createArrangement({
      title,
      note: draftNote || undefined,
      mood: draftMood || undefined,
      timeType: draftTimeType,
      startTime: draftStartTime ? new Date(draftStartTime).getTime() : undefined,
      endTime: draftEndTime ? new Date(draftEndTime).getTime() : undefined,
      location: draftLocation || undefined,
      relatedPeople: draftRelatedPeople ? draftRelatedPeople.split(',').map(s => s.trim()).filter(Boolean) : [],
      executor: draftExecutor,
      source: 'manual'
    });

    const currentList = getArrangements();
    saveArrangements([...currentList, newArrangement]);
    
    onRefresh();
    handleClose();
  };

  const emojiList = ['😊', '😔', '😤', '😰', '🤔'];

  return (
    <>
      {/* 背景遮罩 */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 100,
          opacity: show ? 1 : 0,
          pointerEvents: show ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
      />

      {/* 弹窗内容区 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '75vh',
          background: '#ffffff',
          borderRadius: '20px 20px 0 0',
          zIndex: 101,
          transform: show ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', flexShrink: 0, borderBottom: `1px solid ${COLORS.divider}` }}>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: COLORS.textTertiary, fontSize: '14px', fontStyle: 'italic', padding: 0 }}>
            取消
          </button>
          <div className="arrange-title" style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textPrimary }}>新的安排</div>
          <button onClick={handleComplete} style={{ background: 'none', border: 'none', color: COLORS.textPrimary, fontSize: '14px', fontWeight: 600, padding: 0 }}>
            完成
          </button>
        </div>

        {/* 滚动内容区 */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
          {/* 标题输入 */}
          <div style={{ padding: '20px 20px 12px' }}>
            <input
              ref={titleInputRef}
              className="arrange-title focus:outline-none focus:ring-0"
              type="text"
              placeholder="有什么想记下来？"
              value={draftTitle}
              onChange={(e) => {
                setDraftTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
              style={{
                width: '100%',
                fontSize: '22px',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                boxShadow: 'none',
                color: COLORS.textPrimary,
                padding: '0',
                borderRadius: '0'
              }}
            />
            {titleError && (
              <div style={{ color: COLORS.textTertiary, fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>
                还没写要做什么呢
              </div>
            )}
            <div style={{ height: '1px', background: COLORS.divider, marginTop: '12px' }} />
          </div>

          {/* 时间类型选择 */}
          <div style={{ padding: '12px 20px', display: 'flex', gap: '8px' }}>
            {[
              { type: 'none', label: '暂不设定' },
              { type: 'deadline', label: '截止时间' },
              { type: 'timerange', label: '时间段' },
              { type: 'reminder', label: '提醒' }
            ].map(item => {
              const isSelected = draftTimeType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => setDraftTimeType(item.type as ArrangementTimeType)}
                  style={{
                    background: isSelected ? COLORS.textPrimary : 'none',
                    color: isSelected ? '#fff' : COLORS.textTertiary,
                    border: `1px solid ${isSelected ? COLORS.textPrimary : COLORS.divider}`,
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontStyle: isSelected ? 'normal' : 'italic',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* 时间输入区 */}
          {draftTimeType !== 'none' && (
            <div style={{ padding: '0 20px 12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {draftTimeType === 'deadline' && (
                <div>
                  <input className="focus:outline-none focus:ring-0" type="datetime-local" value={draftStartTime} onChange={e => setDraftStartTime(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary }} />
                </div>
              )}
              {draftTimeType === 'timerange' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <input className="focus:outline-none focus:ring-0" type="datetime-local" value={draftStartTime} onChange={e => setDraftStartTime(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input className="focus:outline-none focus:ring-0" type="datetime-local" value={draftEndTime} onChange={e => setDraftEndTime(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary }} />
                  </div>
                </div>
              )}
              {draftTimeType === 'reminder' && (
                <div>
                  <input className="focus:outline-none focus:ring-0" type="datetime-local" value={draftStartTime} onChange={e => setDraftStartTime(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary }} />
                </div>
              )}
            </div>
          )}

          {/* 展开更多字段 */}
          {!showExtraFields ? (
            <div style={{ padding: '8px 20px' }}>
              <button
                onClick={() => setShowExtraFields(true)}
                style={{ background: 'none', border: 'none', color: COLORS.textTertiary, fontSize: '12px', fontStyle: 'italic', padding: 0, cursor: 'pointer' }}
              >
                ··· 更多细节
              </button>
            </div>
          ) : (
            <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 地点 */}
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', marginBottom: '6px' }}>地点</div>
                <input className="focus:outline-none focus:ring-0" type="text" placeholder="在哪里？" value={draftLocation} onChange={e => setDraftLocation(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary }} />
              </div>
              
              {/* 相关人 */}
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', marginBottom: '6px' }}>与谁</div>
                <input className="focus:outline-none focus:ring-0" type="text" placeholder="用逗号分隔" value={draftRelatedPeople} onChange={e => setDraftRelatedPeople(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary }} />
              </div>

              {/* 心情 */}
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', marginBottom: '6px' }}>此刻的感受</div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                  {emojiList.map(emoji => (
                    <div key={emoji} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setDraftMood(emoji)}
                        style={{ fontSize: '24px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: draftMood === emoji ? 1 : 0.3 }}
                      >
                        {emoji}
                      </button>
                      <div style={{ width: '20px', height: '2px', background: draftMood === emoji ? COLORS.textPrimary : 'transparent', transition: 'background 0.2s' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* 执行方式 */}
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', marginBottom: '6px' }}>由谁来做</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { type: 'user_only', label: '我自己' },
                    { type: 'ai_assist', label: '我和AI' },
                    { type: 'ai_full', label: '交给AI' }
                  ].map(item => {
                    const isSelected = draftExecutor === item.type;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setDraftExecutor(item.type as ArrangementExecutor)}
                        style={{
                          background: isSelected ? COLORS.textPrimary : 'none',
                          color: isSelected ? '#fff' : COLORS.textTertiary,
                          border: `1px solid ${isSelected ? COLORS.textPrimary : COLORS.divider}`,
                          borderRadius: '20px',
                          padding: '5px 14px',
                          fontSize: '12px',
                          fontStyle: isSelected ? 'normal' : 'italic',
                          cursor: 'pointer'
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 备注 */}
              <div>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', marginBottom: '6px' }}>备注</div>
                <textarea className="focus:outline-none focus:ring-0" placeholder="还有什么想说的？" rows={3} value={draftNote} onChange={e => setDraftNote(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#F7F6F2', border: 'none', outline: 'none', boxShadow: 'none', borderRadius: '8px', fontSize: '14px', color: COLORS.textSecondary, resize: 'none' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------
// 安排详情页组件
// ---------------------------
interface ArrangementDetailProps {
  arrangement: Arrangement;
  onClose: () => void;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
  onDelete: (id: string) => void;
  onTeleportToSelf?: (messageId?: string) => void;
  onTeleportToTestChat?: (conversationId: string, messageId?: string) => void;
}

function formatDetailTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  
  if (date.getFullYear() === now.getFullYear()) {
    return `${m}月${d}日 ${h}:${min}`;
  }
  return `${date.getFullYear()}年${m}月${d}日`;
}

function formatDetailDate(timestamp: number): string {
  const date = new Date(timestamp);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}月${d}日`;
}

function ArrangementDetail({ arrangement, onClose, onDone, onSnooze, onDelete, onTeleportToSelf, onTeleportToTestChat }: ArrangementDetailProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 触发滑入动画
    setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleDelete = () => {
    if (window.confirm("这件事就这样了，确认不做了吗？")) {
      setVisible(false);
      setTimeout(() => onDelete(arrangement.id), 300);
    }
  };

  const executorText = {
    user_only: '我自己',
    ai_assist: '我和 AI 一起',
    ai_full: '交给 AI',
  }[arrangement.executor] || '我自己';

  const sourceText = {
    manual: '手动记录',
    self_message: '从消息识别',
    private_chat: '从对话识别',
    group_chat: '从群聊识别',
  }[arrangement.source] || '手动记录';

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 200,
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: '40px', // 稍微留出顶部空间
          background: '#ffffff',
          borderRadius: '20px 20px 0 0',
          zIndex: 201,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* 顶部导航栏 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 20px', 
          height: '52px',
          flexShrink: 0 
        }}>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: '14px', padding: 0 }}>
            ← 返回
          </button>
          <button style={{ background: 'none', border: 'none', color: COLORS.textTertiary, fontSize: '14px', padding: 0 }}>
            编辑
          </button>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '140px' }}>
          {/* ① 标题区域 */}
          <div style={{ padding: '24px 20px 16px' }}>
            <div className="arrange-title" style={{ 
              fontSize: '26px', 
              fontWeight: 700, 
              color: COLORS.textPrimary, 
              letterSpacing: '0.5px',
              lineHeight: 1.3
            }}>
              {arrangement.title}
            </div>
          </div>
          <div style={{ height: '1px', background: COLORS.divider, margin: '0 20px' }} />

          {/* ② 元信息区域 */}
          <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '16px', paddingBottom: '16px' }}>
            {arrangement.timeType !== 'none' && (
              <div style={{ display: 'flex', padding: '10px 20px' }}>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>时间</div>
                <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>
                  {arrangement.timeType === 'deadline' && `截止于 ${formatDetailTime(arrangement.startTime)}`}
                  {arrangement.timeType === 'timerange' && `${formatDetailTime(arrangement.startTime)} 至 ${formatDetailTime(arrangement.endTime)}`}
                  {arrangement.timeType === 'reminder' && `提醒 ${formatDetailTime(arrangement.remindAt || arrangement.startTime)}`}
                </div>
              </div>
            )}
            
            {arrangement.location && (
              <div style={{ display: 'flex', padding: '10px 20px' }}>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>地点</div>
                <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>{arrangement.location}</div>
              </div>
            )}

            {arrangement.relatedPeople && arrangement.relatedPeople.length > 0 && (
              <div style={{ display: 'flex', padding: '10px 20px' }}>
                <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>与</div>
                <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>{arrangement.relatedPeople.join('、')}</div>
              </div>
            )}

            <div style={{ display: 'flex', padding: '10px 20px' }}>
              <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>由谁</div>
              <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>{executorText}</div>
            </div>

            <div style={{ display: 'flex', padding: '10px 20px' }}>
              <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>来自</div>
              <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>{sourceText}</div>
            </div>

            <div style={{ display: 'flex', padding: '10px 20px' }}>
              <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>记于</div>
              <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>{formatDetailDate(arrangement.createdAt)}</div>
            </div>
          </div>

          {/* ③ 心情区域 */}
          {arrangement.mood && (
            <div style={{ display: 'flex', padding: '12px 20px' }}>
              <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>感受</div>
              <div style={{ fontSize: '14px', color: COLORS.textSecondary, fontStyle: 'italic' }}>{arrangement.mood}</div>
            </div>
          )}

          {/* ④ 备注区域 */}
          {arrangement.note && (
            <div style={{ display: 'flex', padding: '12px 20px' }}>
              <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', width: '60px', flexShrink: 0 }}>备注</div>
              <div style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: 1.7, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{arrangement.note}</div>
            </div>
          )}

          {/* ⑤ 关联上下文区域 */}
          {arrangement.contexts && arrangement.contexts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', margin: '4px 20px 16px', gap: '10px' }}>
                <div style={{flex:1, height:'1px', background: COLORS.divider}} />
                <span className="arrange-section-label" style={{ fontSize: '11px', color: COLORS.textTertiary, letterSpacing: '1px' }}>相关对话</span>
                <div style={{flex:1, height:'1px', background: COLORS.divider}} />
              </div>
              
              {arrangement.contexts.map((ctx, idx) => {
                const isSelf = ctx.sourceType === 'self_message';
                
                return (
                  <div key={idx} style={{ padding: '0 20px', marginBottom: '16px' }}>
                    <div style={{ 
                      background: '#F9F8F6', 
                      borderRadius: '12px', 
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        {/* 头像 */}
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '8px', 
                          background: isSelf ? '#1C1C1A' : '#E8E6E0', 
                          color: isSelf ? '#fff' : COLORS.textPrimary,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                          flexShrink: 0
                        }}>
                          {isSelf ? '我' : (ctx.sourceLabel?.charAt(0) || '他')}
                        </div>
                        
                        {/* 气泡内容 */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: COLORS.textTertiary, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{ctx.sourceLabel}</span>
                          </div>
                          <div style={{ 
                            background: isSelf ? '#EAE8E2' : '#fff', 
                            padding: '10px 14px', 
                            borderRadius: isSelf ? '2px 12px 12px 12px' : '2px 12px 12px 12px',
                            fontSize: '14px', 
                            color: COLORS.textPrimary, 
                            lineHeight: 1.6,
                            display: 'inline-block',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}>
                            {ctx.snippet}
                          </div>
                        </div>
                      </div>
                      
                      {/* 传送按钮 */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            if (isSelf) {
                              onTeleportToSelf?.(ctx.messageId);
                            } else {
                              if (ctx.conversationId) {
                                onTeleportToTestChat?.(ctx.conversationId, ctx.messageId);
                              }
                            }
                            // 关闭当前弹窗
                            handleClose();
                          }}
                          style={{
                            background: '#1C1C1A',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s',
                          }}
                          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <span style={{ fontSize: '14px' }}>↩</span>
                          回到现场
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          background: 'rgba(255,255,255,0.95)', 
          backdropFilter: 'blur(8px)',
          padding: '16px 20px 36px', 
          borderTop: `1px solid ${COLORS.divider}` 
        }}>
          <button
            onClick={() => { setVisible(false); setTimeout(() => onDone(arrangement.id), 300); }}
            className="arrange-title"
            style={{ 
              width: '100%', 
              background: COLORS.textPrimary, 
              color: '#fff', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '15px', 
              fontSize: '15px', 
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            做到了
          </button>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              onClick={() => { setVisible(false); setTimeout(() => onSnooze(arrangement.id), 300); }}
              style={{ 
                flex: 1, 
                background: '#F0EEE9', 
                color: COLORS.textSecondary, 
                border: 'none', 
                borderRadius: '10px', 
                padding: '12px', 
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              先放一放
            </button>
            <button
              onClick={handleDelete}
              style={{ 
                flex: 1, 
                background: 'none', 
                border: 'none', 
                color: COLORS.textTertiary, 
                fontSize: '13px', 
                fontStyle: 'italic',
                cursor: 'pointer'
              }}
            >
              不做了也没关系
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------
// 日历视图组件
// ---------------------------
function getArrangementsForDate(dateStr: string, arrangements: Arrangement[]): Arrangement[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startOfDay = new Date(y, m - 1, d, 0, 0, 0).getTime();
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

  return arrangements.filter(a => {
    if (!a.startTime) return false;
    return a.startTime >= startOfDay && a.startTime <= endOfDay;
  });
}

function getDateDecoration(arrangements: Arrangement[]): { type: 'none' | 'mood' | 'dot' | 'multi', value: string } {
  if (arrangements.length === 0) {
    return { type: 'none', value: '' };
  }
  const first = arrangements[0];
  if (first.mood && /^\p{Emoji}/u.test(first.mood)) {
    const firstChar = Array.from(first.mood)[0];
    return { type: 'mood', value: firstChar };
  }
  if (arrangements.length <= 2) {
    return { type: 'dot', value: String(arrangements.length) };
  }
  return { type: 'multi', value: String(arrangements.length) };
}

interface CalendarViewProps {
  arrangements: Arrangement[];
  year: number;
  month: number;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function CalendarView({
  arrangements,
  year,
  month,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}: CalendarViewProps) {
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grids = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    grids.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    grids.push(i);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  let selectedArrangements: Arrangement[] = [];
  let selectedM = '';
  let selectedD = '';
  if (selectedDate) {
    selectedArrangements = getArrangementsForDate(selectedDate, arrangements);
    const parts = selectedDate.split('-');
    selectedM = parseInt(parts[1], 10).toString();
    selectedD = parseInt(parts[2], 10).toString();
  }

  return (
    <div>
      {/* 月份导航栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px', background: 'transparent', border: 'none' }}>
        <button onClick={onPrevMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: COLORS.textTertiary, cursor: 'pointer', padding: '8px 12px' }}>‹</button>
        <div className="arrange-title" style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700, color: COLORS.textPrimary }}>{year}年{month + 1}月</div>
        <button onClick={onNextMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: COLORS.textTertiary, cursor: 'pointer', padding: '8px 12px' }}>›</button>
      </div>

      {/* 星期标题行 */}
      <div style={{ display: 'flex' }}>
        {weekdays.map(wd => (
          <div key={wd} className="arrange-section-label" style={{ flex: 1, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '11px', color: COLORS.textTertiary, letterSpacing: '1px', textAlign: 'center', padding: '4px 0 8px' }}>
            {wd}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {grids.map((dateNum, index) => {
          if (dateNum === null) {
            return <div key={`empty-${index}`} style={{ width: `${100 / 7}%`, aspectRatio: '1' }} />;
          }

          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dateNum.toString().padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayArrangements = getArrangementsForDate(dateStr, arrangements);
          const decoration = getDateDecoration(dayArrangements);
          
          const isSunday = (index % 7) === 0;

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (isSelected) onSelectDate(null);
                else onSelectDate(dateStr);
              }}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 2px',
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: isToday ? '#fff' : (isSunday ? '#C4B8A8' : COLORS.textPrimary),
                background: isToday ? COLORS.textPrimary : (isSelected ? '#E8E6E0' : 'transparent'),
                borderRadius: '50%'
              }}>
                {dateNum}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '12px' }}>
                {decoration.type === 'mood' && (
                  <span style={{ fontSize: '12px', lineHeight: 1 }}>{decoration.value}</span>
                )}
                {decoration.type === 'dot' && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: COLORS.textPrimary, opacity: 0.5 }} />
                )}
                {decoration.type === 'multi' && (
                  <span style={{ fontSize: '10px', color: COLORS.textTertiary, fontStyle: 'italic' }}>{decoration.value}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中的日期安排列表 */}
      {selectedDate && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '4px 20px 16px', gap: '10px' }}>
            <div style={{flex:1, height:'1px', background: COLORS.divider}} />
            <span className="arrange-section-label" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '11px', color: COLORS.textTertiary, letterSpacing: '1px' }}>
              {selectedM}月{selectedD}日
            </span>
            <div style={{flex:1, height:'1px', background: COLORS.divider}} />
          </div>

          {selectedArrangements.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: COLORS.textTertiary, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              这天什么都没有，也挺好
            </div>
          ) : (
            <div>
              {selectedArrangements.map(a => {
                let dotColor = COLORS.textPrimary;
                if (a.status === 'snoozed') dotColor = COLORS.textTertiary;
                else if (a.status === 'done' || a.status === 'auto_done') dotColor = '#D0CEC8';

                const timeStr = formatTime(a.startTime);
                const hasMood = a.mood && /^\p{Emoji}/u.test(a.mood);
                const moodChar = hasMood ? Array.from(a.mood as string)[0] : '';

                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div className="arrange-title" style={{ fontSize: '14px', fontFamily: 'Georgia, serif', color: COLORS.textPrimary }}>
                        {a.title}
                      </div>
                      {hasMood && (
                        <span style={{ fontSize: '12px' }}>{moodChar}</span>
                      )}
                    </div>
                    {timeStr && (
                      <div style={{ fontSize: '11px', color: COLORS.textTertiary, fontStyle: 'italic', flexShrink: 0 }}>
                        {timeStr.split(' ')[1]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------
// AI 弹窗组件
// ---------------------------
interface AICreateModalProps {
  show: boolean;
  onClose: () => void;
  onCreated: () => void;
  onSwitchToManual: () => void;
}

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  isLoading?: boolean;
}

interface ParsedResult {
  title: string;
  timeDescription?: string;
  startTimeISO?: string;
  location?: string;
  relatedPeople?: string[];
  note?: string;
  replyText?: string;
}

function AICreateModal({ show, onClose, onCreated, onSwitchToManual }: AICreateModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [stage, setStage] = useState<'chatting' | 'confirming' | 'done'>('chatting');
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      const aiSettings = getAISettings();
      if (!aiSettings.isEnabled || !aiSettings.apiKey) {
        setMessages([{ role: 'ai', content: 'AI 还没连上，先手动记一下吧' }]);
        setTimeout(() => {
          onSwitchToManual();
        }, 1500);
      } else {
        setMessages([]);
        setTimeout(() => {
          setMessages([{ role: 'ai', content: '有什么想安排的，说给我听' }]);
        }, 400);
      }
    } else {
      setMessages([]);
      setInputText('');
      setStage('chatting');
      setParsedResult(null);
      setIsThinking(false);
    }
  }, [show, onSwitchToManual]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, stage]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);
    setInputText('');
    setIsThinking(true);

    const loadingMessages = [...newMessages, { role: 'ai' as const, content: '', isLoading: true }];
    setMessages(loadingMessages);

    try {
      const aiSettings = getAISettings();
      const systemPrompt = `你是即我APP里的AI助手，帮用户创建「安排」。
和用户用简短、自然的中文对话。语气像一个体贴的朋友，不要太正式。

你的目标是从对话中提取：
- 要做什么（必须）
- 什么时间（尽量确认）
- 在哪里（如果有）
- 和谁（如果有）

今天是${new Date().toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'})}

当你觉得已经获得足够信息时，用以下格式回复（必须严格遵守）：
__CONFIRM__
{
  "title": "安排标题，10字以内",
  "timeDescription": "时间描述",
  "startTimeISO": "ISO时间或空字符串",
  "location": "地点或空字符串",
  "relatedPeople": ["人名数组"],
  "note": "补充说明或空字符串",
  "replyText": "你对用户说的话，确认这条安排的内容"
}

如果信息还不够，就继续用普通对话追问，不要输出__CONFIRM__。
追问要简短，一次只问一个问题。
如果用户说的很完整，可以直接确认，不用多余追问。
回复不要超过50字。`;

      const chatHistory = newMessages.map(m => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant'|'user',
        content: m.content
      }));

      const res = await callAI(aiSettings, chatHistory, systemPrompt);
      
      const confirmIndex = res.indexOf('__CONFIRM__');
      if (confirmIndex !== -1) {
        try {
          const jsonStr = res.substring(confirmIndex + 11).trim();
          const parsed = JSON.parse(jsonStr);
          
          setParsedResult(parsed);
          setStage('confirming');
          setMessages([
            ...newMessages,
            { role: 'ai', content: parsed.replyText || '好的，帮你整理了一下，确认记下来吗？' }
          ]);
        } catch (e) {
          console.error("Parse JSON failed", e);
          setMessages([
            ...newMessages,
            { role: 'ai', content: res.replace('__CONFIRM__', '').trim() || '抱歉，我好像没理解对，能再说详细点吗？' }
          ]);
        }
      } else {
        setMessages([...newMessages, { role: 'ai', content: res }]);
      }
    } catch (e) {
      console.error(e);
      setMessages([
        ...newMessages,
        { role: 'ai', content: '哎呀，网络好像出了点小差错，要不再试一次？' }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedResult) return;
    setStage('done');
    
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    saveRecognizedArrangement({
      ...parsedResult,
      hasArrangement: true,
      confidence: 'high'
    }, lastUserMessage, 'AI对话创建', 'self_message');
    
    setMessages(prev => [...prev, { role: 'ai', content: '记下了。' }]);
    onCreated();
    
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleModify = () => {
    setStage('chatting');
    setParsedResult(null);
    setMessages(prev => [...prev, { role: 'ai', content: '好，那再说说，哪里要调整？' }]);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 100,
          opacity: show ? 1 : 0,
          pointerEvents: show ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '82vh',
          background: '#F7F5F0',
          borderRadius: '20px 20px 0 0',
          zIndex: 101,
          transform: show ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* 顶部导航 */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0, borderBottom: '1px solid #EAE8E2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textTertiary, fontSize: '18px', padding: 0 }}>
              ←
            </button>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: COLORS.textPrimary, letterSpacing: '1px' }}>与 AI 聊聊</div>
            <button onClick={onSwitchToManual} style={{ background: 'none', border: 'none', color: '#C4C2BC', fontSize: '11px', fontStyle: 'italic', padding: 0 }}>
              手动填写
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#C4C2BC', fontStyle: 'italic', textAlign: 'center', padding: '6px 0 10px' }}>
            用自然语言说就好，AI 会帮你整理
          </div>
        </div>

        {/* 对话区 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 20px', background: '#F7F5F0' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ width: '100%', marginBottom: '20px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
              {m.role === 'ai' ? (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  {m.isLoading ? (
                    <div style={{ display: 'flex', gap: '4px', padding: '8px 0', borderLeft: '2px solid #C4C2BC', paddingLeft: '12px', marginBottom: '20px' }}>
                      <div style={{ width: '16px', height: '1px', background: '#C4C2BC', animation: 'lineFadeIn 1.4s infinite ease-in-out both' }} />
                      <div style={{ width: '16px', height: '1px', background: '#C4C2BC', animation: 'lineFadeIn 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                      <div style={{ width: '16px', height: '1px', background: '#C4C2BC', animation: 'lineFadeIn 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
                    </div>
                  ) : (
                    <div style={{ 
                      borderLeft: '2px solid #C4C2BC', 
                      paddingLeft: '12px', 
                      fontFamily: 'Georgia, "Songti SC", serif', 
                      fontSize: '14px', 
                      color: '#8A8880', 
                      fontStyle: 'italic', 
                      lineHeight: 1.7 
                    }}>
                      {m.content}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  display: 'inline-block', 
                  textAlign: 'right',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1C1C1A',
                  fontFamily: 'Georgia, "Songti SC", serif',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #D4D2CC'
                }}>
                  {m.content}
                </div>
              )}
            </div>
          ))}

          {stage === 'confirming' && parsedResult && (
            <div style={{ 
              background: '#FFFEFA', 
              borderRadius: '0', 
              padding: '20px 16px', 
              border: 'none', 
              borderTop: '2px solid #1C1C1A', 
              margin: '4px 0 20px', 
              boxShadow: '2px 4px 12px rgba(0,0,0,0.06)' 
            }}>
              <div style={{ fontFamily: 'Georgia, "Songti SC", serif', fontSize: '20px', fontWeight: 700, color: '#1C1C1A', marginBottom: '12px', letterSpacing: '0.5px' }}>
                {parsedResult.title}
              </div>
              {parsedResult.timeDescription && (
                <div style={{ fontSize: '13px', color: '#8A8880', lineHeight: 2 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>时间 · </span>{parsedResult.timeDescription}
                </div>
              )}
              {parsedResult.location && (
                <div style={{ fontSize: '13px', color: '#8A8880', lineHeight: 2 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>地点 · </span>{parsedResult.location}
                </div>
              )}
              {parsedResult.relatedPeople && parsedResult.relatedPeople.length > 0 && (
                <div style={{ fontSize: '13px', color: '#8A8880', lineHeight: 2 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>与 · </span>{parsedResult.relatedPeople.join('、')}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleConfirm}
                  style={{ flex: 1, background: '#1C1C1A', color: '#fff', padding: '12px 0', borderRadius: '4px', fontFamily: 'Georgia, serif', fontSize: '14px', letterSpacing: '0.5px', border: 'none', cursor: 'pointer' }}
                >
                  就这样，记下来
                </button>
                <button
                  onClick={handleModify}
                  style={{ flex: 1, background: 'transparent', color: '#8A8880', padding: '12px 0', borderRadius: '4px', fontSize: '14px', fontStyle: 'italic', border: '1px solid #D4D2CC', cursor: 'pointer' }}
                >
                  再改改
                </button>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 底部输入区 */}
        {stage !== 'done' && (
          <div style={{ background: '#F7F5F0', borderTop: '1px solid #EAE8E2', padding: '14px 16px 28px', display: 'flex', alignItems: 'center' }}>
            <input
              className="ai-input focus:outline-none focus:ring-0"
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="说说你的安排…"
              disabled={isThinking}
              style={{
                flex: 1,
                background: '#FFFEFA',
                border: '1px solid #EAE8E2',
                borderRadius: '4px',
                padding: '10px 14px',
                fontSize: '15px',
                fontFamily: 'Georgia, "Songti SC", serif',
                color: '#1C1C1A',
                outline: 'none',
                boxShadow: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={isThinking || !inputText.trim()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '4px',
                background: inputText.trim() && !isThinking ? '#1C1C1A' : '#EAE8E2',
                color: '#fff',
                border: 'none',
                fontSize: '18px',
                transition: 'background 200ms',
                marginLeft: '10px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (inputText.trim() && !isThinking) ? 'pointer' : 'default'
              }}
            >
              ↑
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------
// 主页面组件
// ---------------------------
interface ArrangePageProps {
  onTeleportToSelf?: (messageId?: string) => void;
  onTeleportToTestChat?: (conversationId: string, messageId?: string) => void;
}

export default function ArrangePage(props: ArrangePageProps) {
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAICreate, setShowAICreate] = useState(false);
  const [showDoneSection, setShowDoneSection] = useState(false);
  const [showSnoozedSection, setShowSnoozedSection] = useState(false);
  const [selectedArrangement, setSelectedArrangement] = useState<Arrangement | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Scroll states for button visibility
  const [btnVisible, setBtnVisible] = useState(true);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = () => {
    setBtnVisible(false);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      setBtnVisible(true);
    }, 800);
  };

  // Calendar states
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);

  const refreshList = () => setArrangements(getArrangements());

  useEffect(() => {
    const list = getArrangements();
    if (list.length === 0) {
      const mockContext: ArrangementContext = {
        id: "mock-ctx-1",
        sourceType: "self_message",
        sourceLabel: "发给自己",
        snippet: "后天下午记得去趟医院复查，顺便把体检报告带上。",
        timestamp: Date.now() - 86400000,
        conversationId: "send-to-self",
        messageId: "msg-1"
      };
      const mockArrangement = createArrangement({
        title: "去医院复查身体",
        note: "医生交代的，带上上个月的体检报告",
        mood: "🍀 保持心态平静",
        source: "self_message",
        contexts: [mockContext]
      });
      saveArrangements([mockArrangement]);
      setArrangements([mockArrangement]);
    } else {
      setArrangements(list);
    }
    
    // To prevent TS6133 "props is declared but its value is never read"
    // Since we will use them in the next step when building the UI
    console.log(props);
  }, [props]);

  const mainList = arrangements.filter((a) => a.status === 'pending').sort((a, b) => b.createdAt - a.createdAt);
  const snoozedList = arrangements.filter((a) => a.status === 'snoozed');
  const doneList = arrangements.filter((a) => a.status === 'done' || a.status === 'auto_done');

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', flex: 1, minHeight: 0, background: COLORS.pageBg, overflow: 'hidden' }}>
      <style>{fontStyle}</style>
      {/* 顶部区域 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 16px 8px 16px',
        }}
      >
        <div className="arrange-summary" style={{ 
          fontSize: '13px', 
          color: COLORS.textSecondary, 
          fontStyle: 'italic', 
          padding: '20px 4px 16px'
        }}>
          {getTodaySummary(arrangements)}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: 'none',
              color: viewMode === 'list' ? COLORS.textPrimary : COLORS.textTertiary,
              fontSize: '12px',
              border: 'none',
              borderBottom: viewMode === 'list' ? `2px solid ${COLORS.textPrimary}` : '2px solid transparent',
              padding: '4px 0',
              transition: 'all 0.2s',
            }}
          >
            列表
          </button>
          <span style={{ color: COLORS.textTertiary, fontSize: '12px' }}>·</span>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              background: 'none',
              color: viewMode === 'calendar' ? COLORS.textPrimary : COLORS.textTertiary,
              fontSize: '12px',
              border: 'none',
              borderBottom: viewMode === 'calendar' ? `2px solid ${COLORS.textPrimary}` : '2px solid transparent',
              padding: '4px 0',
              transition: 'all 0.2s',
            }}
          >
            日历
          </button>
        </div>
      </div>

      {/* 中间列表区域 */}
      <div 
        onScroll={handleScroll}
        style={{ flex: 1, flexGrow: 1, minHeight: 0, background: COLORS.pageBg, overflowY: 'auto', padding: '0 12px', paddingBottom: viewMode === 'calendar' ? '100px' : '0', position: 'relative' }}
      >
        {viewMode === 'calendar' ? (
          <CalendarView
            arrangements={arrangements}
            year={calendarYear}
            month={calendarMonth}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
            onPrevMonth={() => {
              if (calendarMonth === 0) { setCalendarYear(y => y-1); setCalendarMonth(11) }
              else setCalendarMonth(m => m-1)
              setCalendarSelectedDate(null)
            }}
            onNextMonth={() => {
              if (calendarMonth === 11) { setCalendarYear(y => y+1); setCalendarMonth(0) }
              else setCalendarMonth(m => m+1)
              setCalendarSelectedDate(null)
            }}
          />
        ) : (
          <>
            {/* 主列表 */}
            {mainList.map((a) => (
              <ArrangementCard 
                key={a.id} 
                arrangement={a} 
                onRefresh={refreshList} 
                onClick={(arr) => { setSelectedArrangement(arr); setShowDetail(true); }}
              />
            ))}

            {/* 空状态 */}
            {mainList.length === 0 && snoozedList.length === 0 && (
              <div style={{textAlign:'center', paddingTop:'60px'}}>
                <div style={{
                  fontSize: '13px',
                  color: COLORS.textTertiary,
                  fontStyle: 'italic',
                  lineHeight: 2,
                  letterSpacing: '0.5px'
                }}>
                  今天是一张白纸
                  <br/>
                  <span style={{fontSize:'11px'}}>想记什么就记什么</span>
                </div>
              </div>
            )}

            {/* 搁置区 */}
            {snoozedList.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div
                  onClick={() => setShowSnoozedSection(!showSnoozedSection)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '4px 0 4px',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{flex:1, height:'1px', background: COLORS.divider}} />
                  <span className="arrange-section-label" style={{
                    fontSize: '11px',
                    color: COLORS.textTertiary,
                    fontStyle: 'italic',
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap'
                  }}>
                    {snoozedList.length} 件事暂且放着
                  </span>
                  <div style={{flex:1, height:'1px', background: COLORS.divider}} />
                </div>
                {showSnoozedSection &&
                  snoozedList.map((a) => (
                    <ArrangementCard 
                      key={a.id} 
                      arrangement={a} 
                      onRefresh={refreshList} 
                      onClick={(arr) => { setSelectedArrangement(arr); setShowDetail(true); }}
                      readOnly 
                    />
                  ))}
              </div>
            )}

            {/* 已完成区 */}
            {doneList.length > 0 && (
              <div style={{ marginTop: '16px', paddingBottom: '40px' }}>
                <div
                  onClick={() => setShowDoneSection(!showDoneSection)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '4px 0 4px',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{flex:1, height:'1px', background: COLORS.divider}} />
                  <span className="arrange-section-label" style={{
                    fontSize: '11px',
                    color: COLORS.textTertiary,
                    fontStyle: 'italic',
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap'
                  }}>
                    已做到 {doneList.length} 件
                  </span>
                  <div style={{flex:1, height:'1px', background: COLORS.divider}} />
                </div>
                {showDoneSection &&
                  doneList.map((a) => (
                    <ArrangementCard 
                      key={a.id} 
                      arrangement={a} 
                      onRefresh={refreshList} 
                      onClick={(arr) => { setSelectedArrangement(arr); setShowDetail(true); }}
                      readOnly 
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部悬浮创建按钮 */}
      <button
        onClick={() => setShowAICreate(true)}
        style={{
          position: 'absolute',
          bottom: '96px',
          right: '20px',
          width: 'auto',
          padding: '12px 20px',
          borderRadius: '24px',
          background: COLORS.textPrimary,
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          opacity: btnVisible ? 1 : 0,
          transform: btnVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.92)',
          transition: 'opacity 300ms ease, transform 300ms ease',
          pointerEvents: btnVisible ? 'auto' : 'none'
        }}
      >
        <span style={{fontSize:'20px', lineHeight:1}}>+</span>
        <span style={{fontSize:'13px', marginLeft:'6px', letterSpacing:'0.5px'}}>记一件事</span>
      </button>

      {/* 简单的创建弹窗占位 */}
      {viewMode === 'list' && showCreateModal && (
        <CreateArrangementModal 
          show={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          onRefresh={refreshList} 
        />
      )}

      {showAICreate && (
        <AICreateModal
          show={showAICreate}
          onClose={() => setShowAICreate(false)}
          onCreated={() => { refreshList(); setShowAICreate(false); }}
          onSwitchToManual={() => { setShowAICreate(false); setTimeout(() => setShowCreateModal(true), 350); }}
        />
      )}

      {selectedArrangement && showDetail && (
        <ArrangementDetail
          arrangement={selectedArrangement}
          onClose={() => { setShowDetail(false); setTimeout(() => setSelectedArrangement(null), 300); }}
          onDone={(id) => { updateArrangement(id, {status:'done'}); refreshList(); setShowDetail(false); setTimeout(() => setSelectedArrangement(null), 300); }}
          onSnooze={(id) => { updateArrangement(id, {status:'snoozed'}); refreshList(); setShowDetail(false); setTimeout(() => setSelectedArrangement(null), 300); }}
          onDelete={(id) => { deleteArrangement(id); refreshList(); setShowDetail(false); setTimeout(() => setSelectedArrangement(null), 300); }}
          onTeleportToSelf={(msgId) => {
            props.onTeleportToSelf?.(msgId);
            setShowDetail(false);
            setTimeout(() => setSelectedArrangement(null), 300);
          }}
          onTeleportToTestChat={(convId, msgId) => {
            props.onTeleportToTestChat?.(convId, msgId);
            setShowDetail(false);
            setTimeout(() => setSelectedArrangement(null), 300);
          }}
        />
      )}
    </div>
  );
}
