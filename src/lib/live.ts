import { useSyncExternalStore } from 'react'
import type { QueryClient } from '@tanstack/react-query'

export type LiveStatus = 'live' | 'reconnecting'

// ---- status store (read by useLiveStatus) ----
let status: LiveStatus = 'reconnecting'
const listeners = new Set<() => void>()

function setStatus(next: LiveStatus) {
  if (status === next) return
  status = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// 'live' = socket open, 'reconnecting' = everything else.
export function useLiveStatus(): LiveStatus {
  return useSyncExternalStore(subscribe, () => status)
}

// ---- socket client ----
const MAX_WAIT = 30_000 // reconnect waits: 1s, 2s, 4s, 8s, 16s, then 30s
const PING_EVERY = 25_000 // the hub answers "ping" with "pong" without waking up
const PONG_WITHIN = 10_000 // no answer in this time = the connection is dead

let currentStop: (() => void) | null = null

// Closes the socket and stops reconnecting. Safe to call at any time.
export function stopLive() {
  currentStop?.()
}

export function startLive(queryClient: QueryClient): () => void {
  stopLive()

  let socket: WebSocket | null = null
  let stopped = false
  let attempt = 0
  let needsReload = false // true after any lost connection; the next open reloads everything
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let pingTimer: ReturnType<typeof setTimeout> | undefined
  let pongTimer: ReturnType<typeof setTimeout> | undefined

  const invalidateAll = () => {
    void queryClient.invalidateQueries()
  }

  const invalidateTopic = (topic: string) => {
    void queryClient.invalidateQueries({ queryKey: [topic] })
    void queryClient.invalidateQueries({ queryKey: ['summary'] })
  }

  const stopHeartbeat = () => {
    clearTimeout(pingTimer)
    clearTimeout(pongTimer)
  }

  const resetHeartbeat = (ws: WebSocket) => {
    stopHeartbeat()
    pingTimer = setTimeout(() => {
      if (ws !== socket || ws.readyState !== WebSocket.OPEN) return
      try {
        ws.send('ping')
      } catch {
        // the close handling below takes over
      }
      pongTimer = setTimeout(() => lost(ws), PONG_WITHIN)
    }, PING_EVERY)
  }

  const scheduleReconnect = () => {
    if (stopped) return
    clearTimeout(retryTimer)
    const wait = Math.min(1000 * 2 ** attempt, MAX_WAIT)
    attempt += 1
    retryTimer = setTimeout(connect, wait)
  }

  // The socket closed, failed to open, or stopped answering.
  function lost(ws: WebSocket) {
    if (ws !== socket) return
    socket = null
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
    try {
      ws.close()
    } catch {
      // already closed
    }
    stopHeartbeat()
    needsReload = true
    setStatus('reconnecting')
    scheduleReconnect()
  }

  function connect() {
    if (stopped) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    let ws: WebSocket
    try {
      ws = new WebSocket(`${protocol}://${window.location.host}/api/live`)
    } catch {
      scheduleReconnect()
      return
    }
    socket = ws

    ws.onopen = () => {
      if (ws !== socket) return
      attempt = 0
      setStatus('live')
      if (needsReload) {
        needsReload = false
        invalidateAll() // reconnected: reload everything once so nothing is missed
      }
      resetHeartbeat(ws)
    }

    ws.onmessage = (event) => {
      if (ws !== socket) return
      resetHeartbeat(ws)
      if (typeof event.data !== 'string' || event.data === 'pong') return
      try {
        const message = JSON.parse(event.data) as { topic?: unknown }
        if (typeof message.topic === 'string' && message.topic) invalidateTopic(message.topic)
      } catch {
        // not a topic message, ignore
      }
    }

    ws.onclose = () => lost(ws)
    ws.onerror = () => {} // a close event always follows
  }

  // Tab becomes visible while the socket is down: reload everything and try right away.
  const onVisible = () => {
    if (stopped || document.visibilityState !== 'visible') return
    if (socket) return // open or already connecting
    clearTimeout(retryTimer)
    attempt = 0
    invalidateAll()
    connect()
  }
  document.addEventListener('visibilitychange', onVisible)

  // Start on the next tick, so React StrictMode's instant mount/unmount/mount in dev
  // never opens (and then aborts) a socket.
  retryTimer = setTimeout(connect, 0)

  const stop = () => {
    if (stopped) return
    stopped = true
    clearTimeout(retryTimer)
    stopHeartbeat()
    document.removeEventListener('visibilitychange', onVisible)
    if (socket) {
      const ws = socket
      socket = null
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
      try {
        ws.close()
      } catch {
        // already closed
      }
    }
    setStatus('reconnecting')
    if (currentStop === stop) currentStop = null
  }
  currentStop = stop
  return stop
}