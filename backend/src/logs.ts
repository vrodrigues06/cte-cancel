type LogEntry = {
  ts: string
  event: string
  payload?: unknown
}

const store: LogEntry[] = []

export function appendLog(event: string, payload?: unknown) {
  store.push({ ts: new Date().toISOString(), event, payload })
  if (store.length > 500) store.shift()
}

export function getLogs() {
  return store.slice(-200)
}
