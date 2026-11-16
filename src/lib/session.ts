import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_MAX_AGE, SessionPayload, signToken, verifyToken } from './auth'

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setSession(payload: SessionPayload) {
  const store = await cookies()
  store.set(SESSION_COOKIE, signToken(payload), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSession() {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}

// Guards for server actions. Return the session or an error object.
export type Guard<T> = { session: T; error?: undefined } | { session?: undefined; error: string }

export async function requireAdmin(roles?: Array<'PROVOST' | 'REGISTRAR' | 'BURSAR'>): Promise<Guard<SessionPayload>> {
  const session = await getSession()
  if (!session || session.type !== 'ADMIN') return { error: 'Not authenticated. Please sign in again.' }
  if (roles && !roles.includes(session.role as 'PROVOST' | 'REGISTRAR' | 'BURSAR')) {
    return { error: 'You do not have permission to perform this action.' }
  }
  return { session }
}

export async function requireStudent(): Promise<Guard<SessionPayload>> {
  const session = await getSession()
  if (!session || session.type !== 'STUDENT') return { error: 'Not authenticated. Please sign in again.' }
  return { session }
}
