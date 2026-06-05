'use client'

import { useState } from 'react'
import { Task, Priority, Weight } from '@/types'
import TagBadge from './TagBadge'
import TaskForm from './TaskForm'
import DeleteRepeatDialog from './DeleteRepeatDialog'
import EditRepeatDialog from './EditRepeatDialog'

const priorityColor: Record<Priority, string> = {
  high: '#E03E3E',
  medium: '#D9730D',
  low: '#6E5ED2',
}

const weightStyle: Record<Weight, { color: string; bg: string }> = {
  '大': { color: '#37352F', bg: '#EFEEEB' },
  '中': { color: '#9B9A97', bg: '#F5F5F3' },
  '小': { color: '#C4C4C0', bg: '#FAFAF8' },
}

function formatDeadline(deadline: string | null, deadlineTime?: string): { label: string; color: string; bg: string } {
  if (!deadline) return { label: '', color: '', bg: '' }
  const date = new Date(deadline + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const timeSuffix = deadlineTime ? ` ${deadlineTime}` : ''
  if (diff < 0) return { label: `${month}/${day} 期限切れ`, color: '#E03E3E', bg: '#FFEAEA' }
  if (diff === 0) return { label: `今日まで${timeSuffix}`, color: '#D9730D', bg: '#FFF3E0' }
  if (diff === 1) return { label: `明日${timeSuffix}`, color: '#D9730D', bg: '#FFF3E0' }
  if (diff <= 3) return { label: `${month}/${day}${timeSuffix}`, color: '#D9730D', bg: '#FFF3E0' }
  return { label: `${month}/${day}${timeSuffix}`, color: '#9B9A97', bg: '#EFEEEB' }
}

interface TaskCardProps {
  task: Task
  allTags: string[]
  onUpdate: (id: string, data: Partial<Task>, repeatMode?: 'single' | 'future' | 'all') => void
  onDelete: (id: string, repeatMode: 'single' | 'future') => void
  showTimelineToggle?: boolean
  onToggleTimeline?: (task: Task) => void
  todayStr?: string
  viewDateStr?: string
}

export default function TaskCard({ task, allTags, onUpdate, onDelete, showTimelineToggle = false, onToggleTimeline, todayStr, viewDateStr }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<Partial<Task> | null>(null)
  const [hovered, setHovered] = useState(false)

  const refDate = viewDateStr ?? todayStr
  const refTime = refDate
    ? new Date(refDate + 'T00:00:00').getTime()
    : new Date().setHours(0, 0, 0, 0)
  const refWeekday = new Date(refTime).getDay()

  const isOnTimeline = task.timelineDate === todayStr
  const dl = formatDeadline(task.deadline, task.deadlineTime)
  const pColor = task.completed ? '#D3D3CF' : priorityColor[task.priority]

  const isWeeklyDueToday = !task.completed &&
    task.repeat?.type === 'weekly' &&
    task.repeat?.weekday !== undefined &&
    refWeekday === task.repeat.weekday

  const daysLeft = isWeeklyDueToday
    ? 0
    : task.deadline
      ? Math.floor((new Date(task.deadline + 'T00:00:00').getTime() - refTime) / 86400000)
      : null
  const showDaysLeft = !task.completed && daysLeft !== null && daysLeft >= 0 &&
    (daysLeft <= 5 || (task.weight === '大' && daysLeft <= 14))

  const minutesLeft = daysLeft === 0 && task.deadline
    ? Math.ceil((new Date(task.deadline + 'T' + (task.deadlineTime || '23:59')).getTime() - Date.now()) / 60000)
    : null

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: task.completed ? '#FAFAF8' : '#FFFFFF',
          border: '1px solid #E9E9E7',
          borderRadius: 6,
          opacity: task.completed ? 0.7 : 1,
          display: 'flex',
          overflow: 'hidden',
          transition: 'box-shadow 0.1s',
          boxShadow: hovered && !task.completed ? '0 1px 4px rgba(55,53,47,0.06)' : 'none',
        }}
      >
        {/* Left priority accent */}
        <div style={{ width: 3, flexShrink: 0, background: pColor, borderRadius: '6px 0 0 6px' }} />

        <div
          style={{ flex: 1, padding: '10px 10px 10px 12px', cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* Checkbox */}
            <button
              onClick={e => { e.stopPropagation(); onUpdate(task.id, { completed: !task.completed }) }}
              style={{
                flexShrink: 0,
                marginTop: 2,
                width: 16,
                height: 16,
                borderRadius: 3,
                border: `1.5px solid ${task.completed ? '#37352F' : '#D3D3CF'}`,
                background: task.completed ? '#37352F' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.1s',
              }}
            >
              {task.completed && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: task.completed ? '#9B9A97' : '#37352F',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  lineHeight: 1.4,
                  display: 'block',
                }}
              >
                {task.title}
              </span>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 5 }}>
                {task.deadline && daysLeft !== 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: dl.bg,
                    color: dl.color,
                  }}>
                    {dl.label}
                  </span>
                )}
                {task.weight && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: task.completed ? '#F5F5F3' : weightStyle[task.weight].bg,
                    color: task.completed ? '#C4C4C0' : weightStyle[task.weight].color,
                    border: '1px solid rgba(0,0,0,0.05)',
                  }}>
                    {task.weight}
                  </span>
                )}
                {task.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
              </div>

              {task.memo && !expanded && (
                <p style={{ fontSize: 12, marginTop: 4, color: '#9B9A97', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'pre-wrap' }}>
                  {task.memo}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginRight: -2 }}>
              {showDaysLeft && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: daysLeft! <= 5 ? '#FFF3E0' : '#EFEEEB',
                  color: daysLeft! <= 5 ? '#D9730D' : '#9B9A97',
                  whiteSpace: 'nowrap',
                  marginRight: 2,
                }}>
                  {daysLeft === 0
                    ? minutesLeft !== null && minutesLeft > 60
                      ? `あと${Math.ceil(minutesLeft / 60)}時間`
                      : minutesLeft !== null && minutesLeft > 0
                        ? `あと${Math.ceil(minutesLeft / 5) * 5}分`
                        : '今日まで'
                    : `あと${daysLeft}日`}
                </span>
              )}
              {showTimelineToggle && !task.completed && (
                <ActionButton
                  title={isOnTimeline ? 'タイムラインから削除' : 'タイムラインに追加'}
                  onClick={e => { e.stopPropagation(); onToggleTimeline?.(task) }}
                  active={isOnTimeline}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={isOnTimeline ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </ActionButton>
              )}
              <ActionButton
                title="削除"
                onClick={e => {
                  e.stopPropagation()
                  task.repeatGroupId ? setShowDeleteDialog(true) : onDelete(task.id, 'single')
                }}
                danger
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
              </ActionButton>
            </div>
          </div>

          {/* Expanded edit form */}
          {expanded && (
            <div
              style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EFEEEB' }}
              onClick={e => e.stopPropagation()}
            >
              <TaskForm
                initial={task}
                allTags={allTags}
                onSubmit={data => {
                  if (task.repeatGroupId) {
                    setPendingEdit(data)
                    setShowEditDialog(true)
                  } else {
                    onUpdate(task.id, data)
                    setExpanded(false)
                  }
                }}
                onCancel={() => setExpanded(false)}
                submitLabel="保存"
              />
            </div>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteRepeatDialog
          type="task"
          onClose={() => setShowDeleteDialog(false)}
          onDeleteSingle={() => { onDelete(task.id, 'single'); setShowDeleteDialog(false) }}
          onDeleteFuture={() => { onDelete(task.id, 'future'); setShowDeleteDialog(false) }}
        />
      )}

      {showEditDialog && pendingEdit && (
        <EditRepeatDialog
          onClose={() => { setShowEditDialog(false); setPendingEdit(null) }}
          onSaveSingle={() => {
            onUpdate(task.id, pendingEdit, 'single')
            setShowEditDialog(false); setPendingEdit(null); setExpanded(false)
          }}
          onSaveFuture={() => {
            onUpdate(task.id, pendingEdit, 'future')
            setShowEditDialog(false); setPendingEdit(null); setExpanded(false)
          }}
          onSaveAll={() => {
            onUpdate(task.id, pendingEdit, 'all')
            setShowEditDialog(false); setPendingEdit(null); setExpanded(false)
          }}
        />
      )}
    </>
  )
}

function ActionButton({
  children,
  onClick,
  title,
  active,
  danger,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  title: string
  active?: boolean
  danger?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 6px',
        borderRadius: 4,
        color: hov ? (danger ? '#E03E3E' : '#37352F') : active ? '#37352F' : '#C4C4C0',
        background: hov ? (danger ? '#FFEAEA' : '#EFEEEB') : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  )
}
