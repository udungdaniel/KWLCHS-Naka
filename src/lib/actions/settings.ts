'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import type { ActionResult } from './auth'

export async function getSettings() {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { students: true, staff: true, courses: true } } } })
  return {
    settings,
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      active: d.active,
      students: d._count.students,
      staff: d._count.staff,
      courses: d._count.courses,
    })),
  }
}

export async function updateSettings(input: {
  schoolName?: string
  shortName?: string
  address?: string
  phone?: string
  email?: string
  motto?: string
  about?: string
  currentSession?: string
  currentSemester?: number
  admissionOpen?: boolean
  whatsappLine?: string
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.setting.update({
    where: { id: 'main' },
    data: {
      ...(input.schoolName ? { schoolName: input.schoolName.trim() } : {}),
      ...(input.shortName ? { shortName: input.shortName.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
      ...(input.motto !== undefined ? { motto: input.motto?.trim() || null } : {}),
      ...(input.about !== undefined ? { about: input.about?.trim() || null } : {}),
      ...(input.currentSession ? { currentSession: input.currentSession.trim() } : {}),
      ...(input.currentSemester ? { currentSemester: input.currentSemester } : {}),
      ...(input.admissionOpen !== undefined ? { admissionOpen: input.admissionOpen } : {}),
      ...(input.whatsappLine !== undefined ? { whatsappLine: input.whatsappLine?.trim() || null } : {}),
    },
  })
  return { ok: true }
}

// ---------- Departments ----------
export async function createDepartment(input: { name: string; code: string; description?: string }): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.name?.trim() || !input.code?.trim()) return { ok: false, error: 'Department name and code are required.' }
  const code = input.code.trim().toUpperCase()
  const existing = await db.department.findFirst({ where: { OR: [{ name: input.name.trim() }, { code }] } })
  if (existing) return { ok: false, error: 'A department with that name or code already exists.' }
  await db.department.create({ data: { name: input.name.trim(), code, description: input.description?.trim() || null } })
  return { ok: true }
}

export async function updateDepartment(
  id: string,
  input: { name?: string; code?: string; description?: string; active?: boolean }
): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.department.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  })
  return { ok: true }
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  const students = await db.student.count({ where: { departmentId: id } })
  const staff = await db.staff.count({ where: { departmentId: id } })
  if (students > 0 || staff > 0) {
    return { ok: false, error: `Cannot delete: ${students} student(s) and ${staff} staff are attached to this department. Deactivate it instead.` }
  }
  await db.course.deleteMany({ where: { departmentId: id } })
  await db.feeStructure.deleteMany({ where: { departmentId: id } })
  await db.timetable.deleteMany({ where: { departmentId: id } })
  await db.department.delete({ where: { id } })
  return { ok: true }
}

// ---------- Admin dashboard ----------
export async function getAdminDashboard() {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR', 'BURSAR'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const session = settings?.currentSession || ''

  const [students, staff, pendingApps, payments, feeItems, announcements] = await Promise.all([
    db.student.findMany({ where: { status: 'ACTIVE' }, select: { level: true } }),
    db.staff.count({ where: { status: 'ACTIVE' } }),
    db.application.count({ where: { status: 'PENDING' } }),
    db.payment.findMany({
      where: { session },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { student: { select: { firstName: true, lastName: true, matricNo: true } } },
    }),
    db.feeStructure.findMany({ where: { session } }),
    db.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  const collectedAgg = await db.payment.aggregate({ where: { session }, _sum: { amount: true } })
  const collected = collectedAgg._sum.amount || 0

  const studentsFull = await db.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, departmentId: true, level: true, payments: { where: { session } } },
  })
  let payableTotal = 0
  for (const s of studentsFull) {
    const items = feeItems.filter((f) => f.departmentId === s.departmentId && f.level === s.level)
    payableTotal += items.reduce((a, b) => a + b.amount, 0)
  }
  const paidTotal = studentsFull.reduce((a, s) => a + s.payments.reduce((x, y) => x + y.amount, 0), 0)

  const levelCounts = [100, 200, 300, 400].map((l) => ({
    level: l,
    count: students.filter((s) => s.level === l).length,
  }))

  return {
    session,
    semester: settings?.currentSemester || 1,
    schoolName: settings?.schoolName || '',
    stats: {
      students: students.length,
      staff,
      pendingApplications: pendingApps,
      collected,
      payableTotal,
      outstanding: Math.max(0, payableTotal - paidTotal),
    },
    levelCounts,
    recentPayments: payments.map((p) => ({
      id: p.id,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      matricNo: p.student.matricNo,
      amount: p.amount,
      method: p.method,
      createdAt: p.createdAt,
    })),
    announcements: announcements.map((a) => ({ id: a.id, title: a.title, createdAt: a.createdAt, audience: a.audience })),
  }
}
