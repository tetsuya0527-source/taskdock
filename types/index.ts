export type Priority = 'high' | 'medium' | 'low'
export type Weight = '大' | '中' | '小'
export type RepeatType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RepeatConfig {
  type: RepeatType
  interval: number
  weekday?: number  // 0-6 (日〜土), weekly のみ使用
  endDate?: string
}

export interface Task {
  id: string
  title: string
  deadline: string | null // YYYY-MM-DD
  priority: Priority
  completed: boolean
  memo: string
  repeat: RepeatConfig | null
  tags: string[]
  linkedEventIds: string[]
  createdAt: string
  deadlineTime?: string  // HH:mm、未設定時は 23:59 扱い
  repeatGroupId?: string
  timelineDate?: string | null
  timelineOrder?: number | null
  weight?: Weight
}

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD, multi-day events only
  startTime: string // HH:mm
  endTime: string // HH:mm
  location: string
  memo: string
  repeat: RepeatConfig | null
  tags: string[]
  linkedTaskIds: string[]
  rows: (1 | 2 | 3 | 4)[] // which rows in horizontal calendar (supports multi-row)
  createdAt: string
  repeatGroupId?: string
  color?: string
}

export interface PeriodRepeat {
  type: 'monthly'
  startDay: number  // 1-31
  endDay: number    // 1-31, equal to startDay for single-day repeat
}

export interface CalendarPeriod {
  id: string
  title: string
  startDate: string
  endDate: string
  color: string
  repeat?: PeriodRepeat
}

export interface AppData {
  tasks: Task[]
  events: CalendarEvent[]
  taskTags: string[]
  eventTags: string[]
  periods: CalendarPeriod[]
  eventTagColors: Record<string, string>
}
