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