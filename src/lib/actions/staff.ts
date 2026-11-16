'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { ATTENDANCE_STATUSES } from '@/lib/constants'
import { todayStr } from '@/lib/format'
import type { ActionResult } from './auth'

export async function getStaff(filters?: { departmentId?: string; q?: string }) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const staff = await db.staff.findMany({
    where: filters?.departmentId ? { departmentId: filters.departmentId } : {},
    include: {
      department: { select: { name: true, code: true } },
      courses: { select: { code: true, title: true } },
      attendances: { orderBy: { date: 'desc' }, take: 10 },
    },
    orderBy: [{ lastName: 'asc' }],
  })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  const q = (filters?.q || '').trim().toLowerCase()
  const filtered = q
    ? staff.filter(
        (s) =>
          `${s.firstName} ${s.lastName} ${s.otherName || ''}`.toLowerCase().includes(q) ||
          s.staffNo.toLowerCase().includes(q) ||
          (s.specialty || '').toLowerCase().includes(q)
      )
    : staff

  return {
    staff: filtered.map((s) => ({
      id: s.id,
      staffNo: s.staffNo,
      fullName: [s.firstName, s.otherName, s.lastName].filter(Boolean).join(' '),
      gender: s.gender,
      dob: s.dob,
      email: s.email,
      phone: s.phone,
      department: s.department?.name || null,
      departmentId: s.departmentId,
      specialty: s.specialty,
      qualifications: s.qualifications,
      rank: s.rank,
      salary: s.salary,
      picture: s.picture,
      status: s.status,
      employmentDate: s.employmentDate,
      courses: s.courses,
      attendance: s.attendances,
    })),
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
  }
}

export type StaffInput = {
  firstName: string
  lastName: string
  otherName?: string
  gender?: string
  dob?: string
  email?: string
  phone?: string
  departmentId?: string
  specialty?: string
  qualifications?: string
  rank: string
  salary?: number
  employmentDate?: string
  status?: string
  picture?: string | null
}

export async function createStaff(input: StaffInput): Promise<ActionResult<{ staffNo: string }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.firstName?.trim() || !input.lastName?.trim()) return { ok: false, error: 'First and last name are required.' }
  if (!input.rank) return { ok: false, error: 'Rank is required.' }
  if (input.picture && input.picture.length > 500_000) {
    return { ok: false, error: 'Picture is too large. Please use an image under 400KB.' }
  }
  const year = new Date().getFullYear()
  const seq = (await db.staff.count()) + 1
  let staffNo = `KWLCHS/STF/${year}/${String(seq).padStart(3, '0')}`
  let attempt = 1
  while (await db.staff.findUnique({ where: { staffNo } })) {
    staffNo = `KWLCHS/STF/${year}/${String(seq + attempt).padStart(3, '0')}`
    attempt++
  }
  await db.staff.create({
    data: {
      staffNo,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      otherName: input.otherName?.trim() || null,
      gender: input.gender || null,
      dob: input.dob || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      departmentId: input.departmentId || null,
      specialty: input.specialty?.trim() || null,
      qualifications: input.qualifications?.trim() || null,
      rank: input.rank,
      salary: input.salary || 0,
      employmentDate: input.employmentDate || null,
      status: input.status || 'ACTIVE',
      picture: input.picture || null,
    },
  })
  return { ok: true, data: { staffNo } }
}

export async function updateStaff(id: string, input: Partial<StaffInput>): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const existing = await db.staff.findUnique({ where: { id } })
  if (!existing) return { ok: false, error: 'Staff not found.' }
  if (input.picture && input.picture.length > 500_000) {
    return { ok: false, error: 'Picture is too large. Please use an image under 400KB.' }
  }
  await db.staff.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(input.otherName !== undefined ? { otherName: input.otherName?.trim() || null } : {}),
      ...(input.gender !== undefined ? { gender: input.gender || null } : {}),
      ...(input.dob !== undefined ? { dob: input.dob || null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId || null } : {}),
      ...(input.specialty !== undefined ? { specialty: input.specialty?.trim() || null } : {}),
      ...(input.qualifications !== undefined ? { qualifications: input.qualifications?.trim() || null } : {}),
      ...(input.rank ? { rank: input.rank } : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
      ...(input.employmentDate !== undefined ? { employmentDate: input.employmentDate || null } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.picture ? { picture: input.picture } : {}),
    },
  })
  return { ok: true }
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.staffAttendance.deleteMany({ where: { staffId: id } })
  await db.course.updateMany({ where: { lecturerId: id }, data: { lecturerId: null } })
  await db.timetable.updateMany({ where: { lecturerId: id }, data: { lecturerId: null } })
  await db.staff.delete({ where: { id } })
  return { ok: true }
}

// ---------- Attendance ----------
export async function getAttendance(date?: string) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const d = date || todayStr()
  const staff = await db.staff.findMany({
    where: { status: 'ACTIVE' },
    include: { attendances: { where: { date: d } }, department: { select: { name: true } } },
    orderBy: { lastName: 'asc' },
  })
  const records = staff.map((s) => ({
    staffId: s.id,
    staffNo: s.staffNo,
    fullName: `${s.firstName} ${s.lastName}`,
    department: s.department?.name || null,
    rank: s.rank,
    status: s.attendances[0]?.status || null,
  }))
  const monthRecords = await db.staffAttendance.findMany({
    where: { date: { startsWith: d.slice(0, 7) } },
    orderBy: { date: 'desc' },
    include: { staff: { select: { firstName: true, lastName: true, staffNo: true } } },
  })
  return {
    date: d,
    records,
    month: monthRecords.map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      staffNo: r.staff.staffNo,
      staffName: `${r.staff.firstName} ${r.staff.lastName}`,
    })),
    counts: {
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      leave: records.filter((r) => r.status === 'LEAVE').length,
      unmarked: records.filter((r) => !r.status).length,
      total: records.length,
    },
  }
}

export async function markAttendance(staffId: string, date: string, status: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!ATTENDANCE_STATUSES.includes(status as (typeof ATTENDANCE_STATUSES)[number])) {
    return { ok: false, error: 'Invalid attendance status.' }
  }
  const existing = await db.staffAttendance.findUnique({ where: { staffId_date: { staffId, date } } })
  if (existing) {
    await db.staffAttendance.update({ where: { id: existing.id }, data: { status } })
  } else {
    await db.staffAttendance.create({ data: { staffId, date, status } })
  }
  return { ok: true }
}

export async function markAllAttendance(date: string, status: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const staff = await db.staff.findMany({ where: { status: 'ACTIVE' } })
  for (const s of staff) {
    const existing = await db.staffAttendance.findUnique({ where: { staffId_date: { staffId: s.id, date } } })
    if (existing) {
      await db.staffAttendance.update({ where: { id: existing.id }, data: { status } })
    } else {
      await db.staffAttendance.create({ data: { staffId: s.id, date, status } })
    }
  }
  return { ok: true }
}

// ---------- Course assignment ----------
export async function assignCourse(courseId: string, lecturerId: string | null): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.course.update({ where: { id: courseId }, data: { lecturerId: lecturerId || null } })
  return { ok: true }
}
