'use server'

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/session'
import type { ActionResult } from './auth'

export async function getStudents(filters?: { departmentId?: string; level?: number; status?: string; q?: string }) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const students = await db.student.findMany({
    where: {
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters?.level ? { level: filters.level } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: { department: { select: { name: true, code: true } } },
    orderBy: [{ lastName: 'asc' }],
  })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  const settings = await db.setting.findUnique({ where: { id: 'main' } })

  // balances for current session
  const balances = new Map<string, number>()
  if (settings) {
    for (const s of students) {
      const items = await db.feeStructure.findMany({
        where: { session: settings.currentSession, departmentId: s.departmentId, level: s.level },
      })
      const payable = items.reduce((a, b) => a + b.amount, 0)
      const paid = await db.payment.aggregate({
        where: { studentId: s.id, session: settings.currentSession },
        _sum: { amount: true },
      })
      balances.set(s.id, payable - (paid._sum.amount || 0))
    }
  }

  const q = (filters?.q || '').trim().toLowerCase()
  const filtered = q
    ? students.filter(
        (s) =>
          `${s.firstName} ${s.lastName} ${s.otherName || ''}`.toLowerCase().includes(q) ||
          s.matricNo.toLowerCase().includes(q) ||
          (s.phone || '').includes(q)
      )
    : students

  return {
    students: filtered.map((s) => ({
      id: s.id,
      matricNo: s.matricNo,
      fullName: [s.firstName, s.otherName, s.lastName].filter(Boolean).join(' '),
      gender: s.gender,
      dob: s.dob,
      email: s.email,
      phone: s.phone,
      address: s.address,
      stateOfOrigin: s.stateOfOrigin,
      department: s.department.name,
      departmentCode: s.department.code,
      level: s.level,
      status: s.status,
      photo: s.photo,
      balance: balances.get(s.id) ?? 0,
    })),
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
  }
}

export type StudentInput = {
  firstName: string
  lastName: string
  otherName?: string
  gender: string
  dob?: string
  email?: string
  phone?: string
  address?: string
  stateOfOrigin?: string
  departmentId: string
  level: number
  status?: string
  password?: string
}

export async function createStudent(input: StudentInput): Promise<ActionResult<{ matricNo: string; password: string }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.firstName?.trim() || !input.lastName?.trim()) return { ok: false, error: 'First and last name are required.' }
  if (!input.gender) return { ok: false, error: 'Gender is required.' }
  if (!input.departmentId) return { ok: false, error: 'Department is required.' }

  const dept = await db.department.findUnique({ where: { id: input.departmentId } })
  if (!dept) return { ok: false, error: 'Department not found.' }

  const year = new Date().getFullYear()
  const seq = (await db.student.count({ where: { departmentId: dept.id } })) + 1
  let matricNo = `KWLCHS/${year}/${dept.code}/${String(seq).padStart(3, '0')}`
  // ensure uniqueness
  let attempt = 1
  while (await db.student.findUnique({ where: { matricNo } })) {
    matricNo = `KWLCHS/${year}/${dept.code}/${String(seq + attempt).padStart(3, '0')}`
    attempt++
  }

  const password = input.password?.trim() || `chs${Math.floor(1000 + Math.random() * 9000)}`
  await db.student.create({
    data: {
      matricNo,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      otherName: input.otherName?.trim() || null,
      gender: input.gender,
      dob: input.dob || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      stateOfOrigin: input.stateOfOrigin?.trim() || null,
      departmentId: dept.id,
      level: input.level || 100,
      status: input.status || 'ACTIVE',
      passwordHash: hashPassword(password),
    },
  })
  return { ok: true, data: { matricNo, password } }
}

export async function updateStudent(
  id: string,
  input: Partial<StudentInput> & { photo?: string | null }
): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const existing = await db.student.findUnique({ where: { id } })
  if (!existing) return { ok: false, error: 'Student not found.' }
  if (input.photo && input.photo.length > 500_000) {
    return { ok: false, error: 'Photo is too large. Please use an image under 400KB.' }
  }
  await db.student.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(input.otherName !== undefined ? { otherName: input.otherName?.trim() || null } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.dob !== undefined ? { dob: input.dob || null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
      ...(input.stateOfOrigin !== undefined ? { stateOfOrigin: input.stateOfOrigin?.trim() || null } : {}),
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      ...(input.level ? { level: input.level } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.photo ? { photo: input.photo } : {}),
    },
  })
  return { ok: true }
}

export async function resetStudentPassword(id: string): Promise<ActionResult<{ password: string }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const password = `chs${Math.floor(1000 + Math.random() * 9000)}`
  await db.student.update({ where: { id }, data: { passwordHash: hashPassword(password) } })
  return { ok: true, data: { password } }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.result.deleteMany({ where: { studentId: id } })
  await db.payment.deleteMany({ where: { studentId: id } })
  await db.bookLoan.deleteMany({ where: { studentId: id } })
  await db.student.delete({ where: { id } })
  return { ok: true }
}

export async function promoteStudents(ids: string[]): Promise<ActionResult<{ count: number }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const students = await db.student.findMany({ where: { id: { in: ids } } })
  let count = 0
  for (const s of students) {
    if (s.level >= 400) {
      await db.student.update({ where: { id: s.id }, data: { status: 'GRADUATED' } })
    } else {
      await db.student.update({ where: { id: s.id }, data: { level: s.level + 100 } })
    }
    count++
  }
  return { ok: true, data: { count } }
}
