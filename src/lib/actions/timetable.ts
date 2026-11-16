'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { DAYS } from '@/lib/constants'
import type { ActionResult } from './auth'

export async function getTimetable(filters?: { departmentId?: string; level?: number; session?: string; semester?: number }) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  const deptId = filters?.departmentId || departments[0]?.id
  const level = filters?.level || 100
  const session = filters?.session || settings?.currentSession || ''
  const semester = filters?.semester || settings?.currentSemester || 1

  const courses = await db.course.findMany({
    where: { OR: [{ departmentId: deptId }, { departmentId: null }], level, semester },
    orderBy: { code: 'asc' },
  })
  const staff = await db.staff.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: 'asc' },
  })
  const entries = await db.timetable.findMany({
    where: { session, semester, departmentId: deptId, level },
    include: {
      course: { select: { code: true, title: true } },
      lecturer: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
  })
  return {
    session,
    semester,
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
    courses: courses.map((c) => ({ id: c.id, code: c.code, title: c.title })),
    staff: staff.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` })),
    entries: entries.map((e) => ({
      id: e.id,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      courseId: e.courseId,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      lecturerId: e.lecturerId,
      lecturer: e.lecturer ? `${e.lecturer.firstName} ${e.lecturer.lastName}` : null,
      room: e.room,
    })),
    levels: [100, 200, 300, 400],
  }
}

export async function createTimetableEntry(input: {
  departmentId: string
  level: number
  session: string
  semester: number
  day: string
  startTime: string
  endTime: string
  courseId: string
  lecturerId?: string
  room?: string
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!DAYS.includes(input.day as (typeof DAYS)[number])) return { ok: false, error: 'Invalid day.' }
  if (!input.courseId) return { ok: false, error: 'Please select a course.' }
  if (!input.startTime || !input.endTime) return { ok: false, error: 'Start and end time are required.' }
  if (input.endTime <= input.startTime) return { ok: false, error: 'End time must be after start time.' }

  const clash = await db.timetable.findFirst({
    where: {
      session: input.session,
      semester: input.semester,
      departmentId: input.departmentId,
      level: input.level,
      day: input.day,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
  })
  if (clash) {
    const c = await db.course.findUnique({ where: { id: clash.courseId } })
    return { ok: false, error: `Time clash with ${c?.code || 'another course'} (${clash.startTime}–${clash.endTime}) on ${input.day}.` }
  }
  await db.timetable.create({
    data: {
      departmentId: input.departmentId,
      level: input.level,
      session: input.session,
      semester: input.semester,
      day: input.day,
      startTime: input.startTime,
      endTime: input.endTime,
      courseId: input.courseId,
      lecturerId: input.lecturerId || null,
      room: input.room?.trim() || null,
    },
  })
  return { ok: true }
}

export async function updateTimetableEntry(
  id: string,
  input: Partial<{
    day: string
    startTime: string
    endTime: string
    courseId: string
    lecturerId: string | null
    room: string | null
  }>
): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.timetable.update({
    where: { id },
    data: {
      ...(input.day ? { day: input.day } : {}),
      ...(input.startTime ? { startTime: input.startTime } : {}),
      ...(input.endTime ? { endTime: input.endTime } : {}),
      ...(input.courseId ? { courseId: input.courseId } : {}),
      ...(input.lecturerId !== undefined ? { lecturerId: input.lecturerId || null } : {}),
      ...(input.room !== undefined ? { room: input.room || null } : {}),
    },
  })
  return { ok: true }
}

export async function deleteTimetableEntry(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.timetable.delete({ where: { id } })
  return { ok: true }
}
