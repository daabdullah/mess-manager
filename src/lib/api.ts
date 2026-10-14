type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

// An error that also remembers the HTTP status (401 = not signed in).
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin', // sends the login cookie
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Please check your connection.')
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  // Session expired: go to the login page (but not for the login/setup calls themselves)
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/setup')) {
    if (window.location.pathname !== '/login') window.location.assign('/login')
    throw new ApiError('Please log in again.', 401)
  }

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error
    throw new ApiError(message || `Request failed (${res.status})`, res.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
}