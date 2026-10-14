import { DurableObject } from 'cloudflare:workers'

// One Hub instance (named "main") keeps every open screen's WebSocket.
// It uses the WebSocket Hibernation API: when nothing is happening the object
// sleeps, the connections stay open, and idle time costs nothing.
export class Hub extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)
    // The browser sends "ping", the platform answers "pong" without waking the object.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // A screen connects: keep its socket.
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair()
      this.ctx.acceptWebSocket(pair[1])
      return new Response(null, { status: 101, webSocket: pair[0] })
    }

    // The API tells us something changed: push {"topic": "..."} to every open screen.
    if (request.method === 'POST' && url.pathname === '/notify') {
      let topic: unknown
      try {
        topic = ((await request.json()) as { topic?: unknown }).topic
      } catch {
        topic = undefined
      }
      if (typeof topic !== 'string' || topic.length === 0 || topic.length > 50) {
        return new Response('Bad topic', { status: 400 })
      }
      const message = JSON.stringify({ topic })
      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(message)
        } catch {
          // a dead socket must not stop the others
        }
      }
      return new Response('ok')
    }

    return new Response('Not found', { status: 404 })
  }

  // Screens send nothing except "ping" (answered automatically), so ignore other messages.
  webSocketMessage(): void {}

  webSocketClose(socket: WebSocket): void {
    try {
      socket.close()
    } catch {
      // already closed
    }
  }

  webSocketError(socket: WebSocket): void {
    try {
      socket.close()
    } catch {
      // already closed
    }
  }
}

// Nobody can reach this Worker directly. Only the Pages project talks to the Hub class.
export default {
  fetch(): Response {
    return new Response('Not found', { status: 404 })
  },
}