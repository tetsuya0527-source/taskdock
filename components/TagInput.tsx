'use client'

import { useState } from 'react'
import TagBadge from './TagBadge'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}

export default function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focused, setFocused] = useState(false)

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  )

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag))

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 5,
          padding: '7px 10px',
          borderRadius: 6,
          minHeight: 38,
          border: `1px solid ${focused ? '#37352F' : '#E9E9E7'}`,
          background: '#FAFAF8',
          boxShadow: focused ? '0 0 0 2px rgba(55,53,47,0.1)' : 'none',
          transition: 'border-color 0.1s, box-shadow 0.1s',
        }}
      >
        {value.map(tag => (
          <TagBadge key={tag} tag={tag} onRemove={() => removeTag(tag)} />
        ))}
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
          onFocus={() => { setFocused(true); setShowSuggestions(true) }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150) }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (input.trim()) addTag(input) }
            else if (e.key === 'Backspace' && !input && value.length > 0) onChange(value.slice(0, -1))
          }}
          placeholder={value.length === 0 ? 'タグを追加…' : ''}
          style={{
            flex: 1, minWidth: 80,
            background: 'transparent',
            border: 'none', outline: 'none',
            fontSize: 13, color: '#37352F',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {showSuggestions && (filtered.length > 0 || input.trim()) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0, right: 0,
            zIndex: 20,
            marginTop: 4,
            borderRadius: 6,
            overflow: 'hidden',
            background: '#FFFFFF',
            border: '1px solid #E9E9E7',
            boxShadow: '0 8px 24px rgba(55,53,47,0.1)',
          }}
        >
          {filtered.slice(0, 8).map(tag => (
            <button
              key={tag}
              type="button"
              onMouseDown={() => addTag(tag)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', fontSize: 13, color: '#37352F',
                background: 'transparent', border: 'none',
                fontFamily: 'inherit', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {tag}
            </button>
          ))}
          {input.trim() && !suggestions.includes(input.trim()) && (
            <button
              type="button"
              onMouseDown={() => addTag(input)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', fontSize: 13, color: '#9B9A97',
                background: 'transparent', border: 'none',
                borderTop: '1px solid #EFEEEB',
                fontFamily: 'inherit', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              + &quot;{input.trim()}&quot; を作成
            </button>
          )}
        </div>
      )}
    </div>
  )
}
