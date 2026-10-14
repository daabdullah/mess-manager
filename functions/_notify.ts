import type { Env } from './_types'

// Tells the Hub "something changed in <topic>". The Hub pushes it to every open screen.
// It never throws: if the hub is down or not connected, the save that called us still succeeds.
export async function notify(env: Env, topic: string): Promise<void> {
  try {
    const stub = env.HUB.get(env.HUB.idFromName('main'))
    const res = await stub.fetch('https://hub/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
    if (!res.ok) console.error(`notify(${topic}) got status ${res.status}`)
  } catch (err) {
    console.error(`notify(${topic}) failed`, err)
  }
}