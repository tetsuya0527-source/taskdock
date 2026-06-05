'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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

interface Message {
  id: string
  role: 'user' | 'assistant'
  text?: string
  imageUrl?: string
  image?: string
  mimeType?: string
  items?: ParsedItem[]
  added?: Set<number>
  error?: string
  loading?: boolean
}

function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const PRIORITY_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' }
const PRIORITY_COLOR: Record<string, string> = { high: '#E03E3E', medium: '#D9730D', low: '#6E5ED2' }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: 'こんにちは！スケジュール管理のサポートや、画像からの予定読み取りはもちろん、なんでも気軽に話しかけてください。',
      items: [],
      added: new Set(),
    },
  ])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const processImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setPendingImage({ url: dataUrl, base64, mimeType: file.type || 'image/png' })
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(i => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) processImage(file)
    }
  }, [processImage])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
    e.target.value = ''
  }

  const send = async () => {
    if ((!input.trim() && !pendingImage) || sending) return
    setSending(true)

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim() || undefined,
      imageUrl: pendingImage?.url,
      image: pendingImage?.base64,
      mimeType: pendingImage?.mimeType,
    }
    const loadingId = Date.now().toString() + '-ai'
    const loadingMsg: Message = { id: loadingId, role: 'assistant', loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.value = ''
    const imgData = pendingImage
    setPendingImage(null)

    try {
      const history = messages
        .filter(m => !m.loading && m.id !== 'intro')
        .map(m => ({ role: m.role, text: m.text, image: m.image, mimeType: m.mimeType }))

      const res = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          text: userMsg.text,
          image: imgData?.base64,
          mimeType: imgData?.mimeType,
        }),
      })
      const data = await res.json()

      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, loading: false, text: data.message, items: data.items || [], error: data.error, added: new Set<number>() }
          : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, loading: false, error: '通信エラーが発生しました' }
          : m
      ))
    } finally {
      setSending(false)
    }
  }

  const addItem = async (msgId: string, idx: number, item: ParsedItem) => {
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
          memo: '',
          tags: [],
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
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, added: new Set([...(m.added ?? []), idx]) } : m
    ))
  }

  const addAll = async (msgId: string, items: ParsedItem[], added: Set<number>) => {
    await Promise.all(
      items
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => !added.has(i))
        .map(({ item, i }) => addItem(msgId, i, item))
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>

      {/* Header */}
      <div style={{ padding: '40px 20px 20px', flexShrink: 0, borderBottom: '1px solid #E9E9E7', background: '#FFFFFF' }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#37352F', letterSpacing: '-0.5px' }}>AI</h1>
        <p style={{ fontSize: 13, color: '#9B9A97', fontWeight: 500, marginTop: 4 }}>なんでも話しかけてください</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFAF8' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

            {/* User message */}
            {msg.role === 'user' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, maxWidth: '82%' }}>
                {msg.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.imageUrl} alt="uploaded" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, border: '1px solid #E9E9E7' }} />
                )}
                {msg.text && (
                  <div style={{
                    background: '#EFEEEB',
                    border: '1px solid #E9E9E7',
                    borderRadius: '10px 10px 2px 10px',
                    padding: '9px 13px',
                    fontSize: 14,
                    color: '#37352F',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                )}
              </div>
            )}

            {/* AI message */}
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '92%', width: '92%' }}>

                {msg.loading && (
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E9E9E7',
                    borderRadius: '2px 10px 10px 10px',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4C4C0', animation: `bounce 1s ${i * 0.15}s infinite` }} />
                    ))}
                    <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
                  </div>
                )}

                {msg.text && !msg.loading && (
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E9E9E7',
                    borderRadius: '2px 10px 10px 10px',
                    padding: '11px 14px',
                    fontSize: 14,
                    color: '#37352F',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                )}

                {msg.error && (
                  <div style={{
                    background: '#FFEAEA',
                    border: '1px solid #FECACA',
                    borderRadius: '2px 10px 10px 10px',
                    padding: '10px 14px',
                    fontSize: 13,
                    color: '#E03E3E',
                  }}>
                    {msg.error}
                  </div>
                )}

                {msg.items && msg.items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {msg.items.map((item, idx) => {
                      const isAdded = msg.added?.has(idx)
                      return (
                        <div key={idx} style={{
                          background: '#FFFFFF',
                          border: '1px solid #E9E9E7',
                          borderRadius: 6,
                          padding: '10px 12px',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          opacity: isAdded ? 0.5 : 1,
                          transition: 'opacity 0.2s',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                background: item.type === 'event' ? '#DBEAFE' : item.type === 'task' ? '#EDE9FE' : '#D1FAE5',
                                color: item.type === 'event' ? '#1E40AF' : item.type === 'task' ? '#5B21B6' : '#065F46',
                                flexShrink: 0,
                              }}>
                                {item.type === 'event' ? '予定' : item.type === 'task' ? 'タスク' : '期間'}
                              </span>
                              {item.type === 'period' && (
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                              )}
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#37352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.title}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#9B9A97', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {item.type === 'event' && (
                                <>
                                  {item.date && <span>{item.date}</span>}
                                  {item.startTime && <span>{item.startTime}{item.endTime ? `–${item.endTime}` : ''}</span>}
                                  {item.location && <span>{item.location}</span>}
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
                            onClick={() => !isAdded && addItem(msg.id, idx, item)}
                            disabled={isAdded}
                            style={{
                              flexShrink: 0, padding: '5px 10px', borderRadius: 6,
                              fontSize: 12, fontWeight: 600, border: 'none', fontFamily: 'inherit',
                              background: isAdded ? '#EFEEEB' : '#37352F',
                              color: isAdded ? '#9B9A97' : '#FFFFFF',
                              cursor: isAdded ? 'default' : 'pointer',
                              transition: 'all 0.15s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isAdded ? '追加済み' : '追加'}
                          </button>
                        </div>
                      )
                    })}
                    {msg.items.some((_, i) => !msg.added?.has(i)) && (
                      <button
                        onClick={() => addAll(msg.id, msg.items!, msg.added!)}
                        style={{
                          padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: '#EFEEEB', color: '#37352F',
                          border: '1px solid #E9E9E7',
                          fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.1s',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#E5E4E1')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#EFEEEB')}
                      >
                        すべてを追加
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #E9E9E7', background: '#FFFFFF', padding: '10px 16px calc(env(safe-area-inset-bottom) + 16px + 56px)', flexShrink: 0 }}>
        {pendingImage && (
          <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.url} alt="preview" style={{ height: 64, borderRadius: 6, border: '1px solid #E9E9E7' }} />
            <button
              onClick={() => setPendingImage(null)}
              style={{
                position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
                background: '#37352F', color: '#FFFFFF', border: 'none', fontSize: 10,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="画像を選択"
            style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 6,
              border: '1px solid #E9E9E7', background: '#FAFAF8', color: '#9B9A97',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFEEEB')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FAFAF8')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
            ref={textareaRef}
            placeholder="メッセージを入力…"
            rows={1}
            style={{
              flex: 1, resize: 'none',
              border: '1px solid #E9E9E7', borderRadius: 8,
              padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
              background: '#FAFAF8', color: '#37352F', lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto', outline: 'none',
              transition: 'border-color 0.1s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#37352F')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E9E9E7')}
          />
          <button
            onClick={send}
            disabled={(!input.trim() && !pendingImage) || sending}
            style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 6, border: 'none',
              background: (!input.trim() && !pendingImage) || sending ? '#EFEEEB' : '#37352F',
              color: (!input.trim() && !pendingImage) || sending ? '#C4C4C0' : '#FFFFFF',
              cursor: (!input.trim() && !pendingImage) || sending ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
