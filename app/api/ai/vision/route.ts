import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, type Part, type Content } from '@google/generative-ai'

function getTodayStr() {
  const now = new Date()
  const wd = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()]
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${wd}）`
}

const SYSTEM_PROMPT = `あなたは「taskdock」というアプリのパーソナルアシスタントです。今日は ${getTodayStr()} です。

できること:
- 普通の会話・質問への回答
- 予定・タスクの管理サポート
- 画像（時間割・スクショなど）からの情報読み取り

ガイドライン:
- ユーザーが予定やタスクに関することを話したら、自然に追加を提案する
- 日時・場所などの情報が不足していたら、質問して補完する
- 追加する内容が確定したら items に含める
- 一般的な質問や雑談にも普通に答える
- 返答は日本語で、自然な会話口調で

スケジュールのrows（行）ルール:
- スケジュールには横列が4行（1〜4）ある
- 終日の予定（startTimeなし）→ rows: [1,2,3,4]（全行）
- 時間指定がある場合は時間帯で行を決める:
  - 0:00〜11:59 → rows: [1]（午前）
  - 12:00〜16:59 → rows: [2]（午後）
  - 17:00〜20:59 → rows: [3]（夕方〜夜）
  - 21:00〜23:59 → rows: [4]（深夜）
- 時間割などで同じ日に複数コマある場合は、それぞれ別の行に割り当てる（例: 1限→[1], 2限→[2]）

必ず以下のJSON形式のみで返すこと（マークダウン不要）:
{
  "message": "ユーザーへの返答テキスト",
  "items": [
    // 追加を提案するイベント・タスク・期間。なければ空配列 []
    // イベント: { "type": "event",  "title": "string", "date": "YYYY-MM-DD", "startTime": "HH:mm or ''", "endTime": "HH:mm or ''", "location": "string or ''", "rows": [1] }
    // タスク:   { "type": "task",   "title": "string", "deadline": "YYYY-MM-DD or null", "priority": "high|medium|low" }
    // 期間:     { "type": "period", "title": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "color": "#FEF3C7" }
    // 期間のcolorは以下から選ぶ: "#FEF3C7"(黄), "#D1FAE5"(緑), "#DBEAFE"(青), "#EDE9FE"(紫), "#FCE7F3"(ピンク), "#F3F4F6"(グレー)
  ]
}`

interface HistoryMessage {
  role: 'user' | 'assistant'
  text?: string
  image?: string
  mimeType?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { history, text, image, mimeType } = body as {
      history: HistoryMessage[]
      text?: string
      image?: string
      mimeType?: string
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build conversation history for Gemini
    const geminiHistory: Content[] = history.flatMap(msg => {
      const parts: Part[] = []
      if (msg.image) parts.push({ inlineData: { data: msg.image, mimeType: msg.mimeType || 'image/png' } })
      if (msg.text) parts.push({ text: msg.text })
      if (parts.length === 0) return []
      return [{ role: msg.role === 'assistant' ? 'model' : 'user', parts }]
    })

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: '{"message":"了解です。何でもお気軽にどうぞ！","items":[]}' }] },
        ...geminiHistory,
      ],
    })

    const currentParts: Part[] = []
    if (image) currentParts.push({ inlineData: { data: image, mimeType: mimeType || 'image/png' } })
    if (text) currentParts.push({ text })
    if (currentParts.length === 0) currentParts.push({ text: '(画像のみ)' })

    const result = await chat.sendMessage(currentParts)
    const raw = result.response.text().trim()
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: { message: string; items?: unknown[] }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // If the model returns plain text, wrap it
      parsed = { message: raw, items: [] }
    }

    return NextResponse.json({ message: parsed.message || '', items: parsed.items || [] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'AIエラーが発生しました' }, { status: 500 })
  }
}
