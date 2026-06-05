'use client'

import { useState, useRef } from 'react'

interface ParsedEvent {
  type: 'event'
  title: string
  date: string
  startTime: string
  endTime: string
  location: string
  rows?: (1 | 2 | 3 | 4)[]
}
interface ParsedTask {
  type: 'task'
  title: string
  deadline: string | null
  priority: 'high' | 'medium' | 'low'
}
interface ParsedPeriod {
  type: 'period'
  title: string
  startDate: string
  endDate: string
  color: string
}
type ParsedItem = ParsedEvent | ParsedTask | ParsedPeriod

interface HistoryMessage {
  role: 'user' | 'assistant'
  text?: string
}

interface InlineAIChatProps {
  onAdded?: () => void
}

const PRIORITY_COLOR: Record<string, string> = { high: '#E03E3E', medium: '#D9730D', low: '#6E5ED2' }
const PRIORITY_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' }

function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function InlineAIChat({ onAdded }: InlineAIChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryMessage[]>([])
  const [lastMessage, setLastMessage] = useState('')
  const [lastItems, setLastItems] = useState<ParsedItem[]>([])
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const send = async () => {
    const txt = input.trim()
    if (!txt || loading) return
    setLoading(true)
    setInput('')

    const outgoingHistory = history

    try {
      const res = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: outgoingHistory, text: txt }),
      })
      const data = await res.json()
      setHistory([...outgoingHistory, { role: 'user', text: txt }, { role: 'assistant', text: data.message }])
      setLastMessage(data.message || '')
      setLastItems(data.items || [])
      setAdded(new Set())
      setOpen(true)
    } catch {
      setLastMessage('エラーが発生しました')
      setLastItems([])
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (idx: number, item: ParsedItem) => {
    if (item.type === 'event') {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          date: item.date || getTodayStr(),
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          location: item.location || '',
          memo: '', tags: [],
          rows: item.rows?.length ? item.rows : (!item.startTime ? [1, 2, 3, 4] : [1]),
        }),
      })
    } else if (item.type === 'task') {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          deadline: item.deadline,
          priority: item.priority || 'medium',
          memo: '', tags: [],
        }),
      })
    } else if (item.type === 'period') {
      await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          startDate: item.startDate,
          endDate: item.endDate,
          color: item.color || '#FEF3C7',
        }),
      })
    }
    setAdded(prev => new Set([...prev, idx]))
    onAdded?.()
  }

  const addAll = async () => {
    await Promise.all(
      lastItems
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => !added.has(i))
        .map(({ item, i }) => addItem(i, item))
    )
  }

  const clear = () => {
    setHistory([])
    setLastMessage('')
    setLastItems([])
    setAdded(new Set())
    setOpen(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <style>{`@keyframes inline-ai-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: loading ? '#9B9A97' : '#6E5ED2', pointerEvents: 'none',
          }}>
            {loading ? (
              <svg style={{ animation: 'inline-ai-spin 0.7s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.88 5.76L19.5 9l-5.62 1.24L12 16l-1.88-6.76L4.5 9l5.62-1.24L12 3z" />
              </svg>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="AIに指示… （例：「明日15時に会議」「来週までにレポート作成」）"
            disabled={loading}
            style={{
              width: '100%',
              paddingLeft: 32, paddingRight: 12,
              paddingTop: 8, paddingBottom: 8,
              borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
              border: `1px solid ${focused ? '#6E5ED2' : '#DDD9FF'}`,
              background: '#FAFAFF', color: '#37352F', outline: 'none',
              boxShadow: focused ? '0 0 0 3px rgba(110,94,210,0.1)' : '0 1px 4px rgba(110,94,210,0.06)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />
        </div>
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: !input.trim() || loading ? '#E8E5FF' : '#6E5ED2',
            color: !input.trim() || loading ? '#A8A0E8' : '#FFFFFF',
            border: 'none', fontFamily: 'inherit',
            cursor: !input.trim() || loading ? 'default' : 'pointer',
            transition: 'all 0.1s', whiteSpace: 'nowrap',
          }}
        >
          {loading ? '…' : '送信'}
        </button>
        {open && (
          <button
            onClick={clear}
            style={{
              padding: '8px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: '#EFEEEB', color: '#9B9A97',
              border: 'none', fontFamily: 'inherit', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            クリア
          </button>
        )}
      </div>

      {/* Response panel */}
      {open && (lastMessage || lastItems.length > 0) && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: '#FAFAFF', borderRadius: 6, border: '1px solid #DDD9FF' }}>
          {lastMessage && (
            <p style={{ fontSize: 13, color: '#37352F', lineHeight: 1.6, marginBottom: lastItems.length > 0 ? 8 : 0, whiteSpace: 'pre-wrap' }}>
              {lastMessage}
            </p>
          )}
          {lastItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {lastItems.map((item, idx) => {
                const isAdded = added.has(idx)
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 10px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E9E9E7',
                    opacity: isAdded ? 0.45 : 1, transition: 'opacity 0.2s',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                          background: item.type === 'event' ? '#DBEAFE' : item.type === 'task' ? '#EDE9FE' : '#D1FAE5',
                          color: item.type === 'event' ? '#1E40AF' : item.type === 'task' ? '#5B21B6' : '#065F46',
                        }}>
                          {item.type === 'event' ? '予定' : item.type === 'task' ? 'タスク' : '期間'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#37352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9A97', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {item.type === 'event' && (
                          <>
                            {item.date && <span>{item.date}</span>}
                            {item.startTime && <span>{item.startTime}{item.endTime ? `〜${item.endTime}` : ''}</span>}
                            {item.location && <span>📍 {item.location}</span>}
                          </>
                        )}
                        {item.type === 'task' && (
                          <>
                            {item.deadline && <span>締切: {item.deadline}</span>}
                            <span style={{ color: PRIORITY_COLOR[item.priority] }}>優先度: {PRIORITY_LABEL[item.priority]}</span>
                          </>
                        )}
                        {item.type === 'period' && (
                          <span>{item.startDate} 〜 {item.endDate}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => !isAdded && addItem(idx, item)}
                      disabled={isAdded}
                      style={{
                        flexShrink: 0, padding: '4px 9px', borderRadius: 5,
                        fontSize: 11, fontWeight: 600, border: 'none', fontFamily: 'inherit',
                        background: isAdded ? '#EFEEEB' : '#37352F',
                        color: isAdded ? '#9B9A97' : '#FFFFFF',
                        cursor: isAdded ? 'default' : 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {isAdded ? '追加済み' : '追加'}
                    </button>
                  </div>
                )
              })}
              {lastItems.some((_, i) => !added.has(i)) && lastItems.length > 1 && (
                <button
                  onClick={addAll}
                  style={{
                    padding: '6px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: '#F0F9F0', color: '#16A34A', border: '1px solid #BBF7D0',
                    fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#DCFCE7')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#F0F9F0')}
                >
                  すべてを追加
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
