'use server'

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/session'
import type { AdminRole } from '@/lib/constants'
import type { ActionResult } from './auth'

// ---------- Admin users (Provost only) ----------
export async function getUsers() {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { error: guard.error }
  const users = await db.adminUser.findMany({ orderBy: { createdAt: 'asc' } })
  const me = guard.session
  return {
    users: users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role as AdminRole,
      phone: u.phone,
      active: u.active,
      createdAt: u.createdAt,
      isYou: u.id === me.id,
    })),
  }
}

export async function createUser(input: {
  fullName: string
  email: string
  role: AdminRole
  phone?: string
  password: string
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  const email = input.email?.trim().toLowerCase()
  if (!input.fullName?.trim() || !email) return { ok: false, error: 'Full name and email are required.' }
  if (!['PROVOST', 'REGISTRAR', 'BURSAR'].includes(input.role)) return { ok: false, error: 'Invalid role.' }
  if (!input.password || input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  const existing = await db.adminUser.findUnique({ where: { email } })
  if (existing) return { ok: false, error: 'A user with that email already exists.' }
  await db.adminUser.create({
    data: {
      fullName: input.fullName.trim(),
      email,
      role: input.role,
      phone: input.phone?.trim() || null,
      passwordHash: hashPassword(input.password),
    },
  })
  return { ok: true }
}

export async function updateUser(
  id: string,
  input: { fullName?: string; email?: string; role?: AdminRole; phone?: string; active?: boolean }
): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (id === guard.session.id && input.active === false) {
    return { ok: false, error: 'You cannot deactivate your own account.' }
  }
  const email = input.email?.trim().toLowerCase()
  if (email) {
    const existing = await db.adminUser.findUnique({ where: { email } })
    if (existing && existing.id !== id) return { ok: false, error: 'Another user already uses that email.' }
  }
  await db.adminUser.update({
    where: { id },
    data: {
      ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
      ...(email ? { email } : {}),
      ...(input.role && ['PROVOST', 'REGISTRAR', 'BURSAR'].includes(input.role) ? { role: input.role } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  })
  return { ok: true }
}

export async function resetUserPassword(id: string, newPassword: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!newPassword || newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  await db.adminUser.update({ where: { id }, data: { passwordHash: hashPassword(newPassword) } })
  return { ok: true }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (id === guard.session.id) return { ok: false, error: 'You cannot delete your own account.' }
  const count = await db.adminUser.count()
  if (count <= 1) return { ok: false, error: 'Cannot delete the only admin account.' }
  await db.adminUser.delete({ where: { id } })
  return { ok: true }
}
