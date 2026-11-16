import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const SECRET = process.env.AUTH_SECRET || 'kwlchs-naka-local-dev-secret-2025'

export const SESSION_COOKIE = 'kwlchs_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export type SessionPayload = {
  id: string
  type: 'ADMIN' | 'STUDENT'
  role?: 'PROVOST' | 'REGISTRAR' | 'BURSAR'
  name: string
  ref?: string // matricNo for students
}

// ---------- Password hashing (scrypt) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    if (candidate.length !== expected.length) return false
    return timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

// ---------- Signed tokens (HMAC-SHA256) ----------
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signToken(payload: SessionPayload): string {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 }))
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = createHmac('sha256', SECRET).update(body).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload & { exp: number }
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
