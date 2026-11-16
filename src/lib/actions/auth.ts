'use server'

import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { clearSession, getSession, requireStudent, setSession } from '@/lib/session'

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

export async function adminLogin(email: string, password: string): Promise<ActionResult> {
  const em = (email || '').trim().toLowerCase()
  if (!em || !password) return { ok: false, error: 'Email and password are required.' }
  const user = await db.adminUser.findUnique({ where: { email: em } })
  if (!user || !user.active) return { ok: false, error: 'Invalid email or password.' }
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, error: 'Invalid email or password.' }
  await setSession({ id: user.id, type: 'ADMIN', role: user.role as 'PROVOST' | 'REGISTRAR' | 'BURSAR', name: user.fullName })
  return { ok: true }
}

export async function studentLogin(matricNo: string, password: string): Promise<ActionResult> {
  const mn = (matricNo || '').trim().toUpperCase()
  if (!mn || !password) return { ok: false, error: 'Matric number and password are required.' }
  const student = await db.student.findUnique({ where: { matricNo: mn } })
  if (!student || student.status === 'WITHDRAWN') return { ok: false, error: 'Invalid matric number or password.' }
  if (!verifyPassword(password, student.passwordHash)) return { ok: false, error: 'Invalid matric number or password.' }
  await setSession({
    id: student.id,
    type: 'STUDENT',
    name: `${student.firstName} ${student.lastName}`,
    ref: student.matricNo,
  })
  return { ok: true }
}

export async function logout(): Promise<ActionResult> {
  await clearSession()
  return { ok: true }
}

export async function changePassword(current: string, next: string, confirm: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated.' }
  if (!current || !next) return { ok: false, error: 'All fields are required.' }
  if (next !== confirm) return { ok: false, error: 'New password and confirmation do not match.' }
  if (next.length < 6) return { ok: false, error: 'New password must be at least 6 characters.' }

  if (session.type === 'STUDENT') {
    const guard = await requireStudent()
    if (!guard.session) return { ok: false, error: guard.error }
    const student = await db.student.findUnique({ where: { id: session.id } })
    if (!student) return { ok: false, error: 'Account not found.' }
    if (!verifyPassword(current, student.passwordHash)) return { ok: false, error: 'Current password is incorrect.' }
    await db.student.update({ where: { id: student.id }, data: { passwordHash: hashPassword(next) } })
    return { ok: true }
  }

  const admin = await db.adminUser.findUnique({ where: { id: session.id } })
  if (!admin) return { ok: false, error: 'Account not found.' }
  if (!verifyPassword(current, admin.passwordHash)) return { ok: false, error: 'Current password is incorrect.' }
  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(next) } })
  return { ok: true }
}
