import { Redis } from '@upstash/redis'
import { AppData } from '@/types'

let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

const DATA_KEY = 'appdata'

const emptyData: AppData = {
  tasks: [],
  events: [],
  taskTags: [],
  eventTags: [],
  periods: [],
  eventTagColors: {},
}

export async function readData(): Promise<AppData> {
  try {
    const raw = await getRedis().get<AppData>(DATA_KEY)
    if (!raw) return { ...emptyData }
    return {
      tasks: raw.tasks ?? [],
      events: raw.events ?? [],
      taskTags: raw.taskTags ?? [],
      eventTags: raw.eventTags ?? [],
      periods: raw.periods ?? [],
      eventTagColors: raw.eventTagColors ?? {},
    }
  } catch {
    return { ...emptyData }
  }
}

export async function writeData(data: AppData): Promise<void> {
  await getRedis().set(DATA_KEY, data)
}
