export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
  })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

export function newId(): string {
  return crypto.randomUUID()
}

// Reads the JSON body. Returns null when the body is missing or not a JSON object.
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    const value = await request.json()
    return value && typeof value === 'object' ? (value as T) : null
  } catch {
    return null
  }
}