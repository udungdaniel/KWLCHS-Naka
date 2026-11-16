'use server'

import { db } from '@/lib/db'
import { computeGrade } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import type { ActionResult } from './auth'

// ---------- Courses ----------
export async function getCourses(filters?: { departmentId?: string; level?: number; semester?: number }) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const courses = await db.course.findMany({
    where: {
      ...(filters?.departmentId !== undefined ? { departmentId: filters.departmentId } : {}),
      ...(filters?.level ? { level: filters.level } : {}),
      ...(filters?.semester ? { semester: filters.semester } : {}),
    },
    include: {
      department: { select: { name: true, code: true } },
      lecturer: { select: { firstName: true, lastName: true, staffNo: true } },
    },
    orderBy: [{ level: 'asc' }, { semester: 'asc' }, { code: 'asc' }],
  })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  const staff = await db.staff.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, staffNo: true, departmentId: true },
    orderBy: { lastName: 'asc' },
  })
  return {
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      creditUnits: c.creditUnits,
      semester: c.semester,
      level: c.level,
      departmentId: c.departmentId,
      department: c.department?.name || 'General Studies',
      lecturerId: c.lecturerId,
      lecturer: c.lecturer ? `${c.lecturer.firstName} ${c.lecturer.lastName}` : null,
    })),
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
    staff: staff.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, staffNo: s.staffNo, departmentId: s.departmentId })),
  }
}

export async function createCourse(input: {
  code: string
  title: string
  creditUnits: number
  semester: number
  level: number
  departmentId?: string
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const code = input.code?.trim().toUpperCase()
  if (!code || !input.title?.trim()) return { ok: false, error: 'Course code and title are required.' }
  const existing = await db.course.findUnique({ where: { code } })
  if (existing) return { ok: false, error: `A course with code ${code} already exists.` }
  await db.course.create({
    data: {
      code,
      title: input.title.trim(),
      creditUnits: input.creditUnits || 2,
      semester: input.semester || 1,
      level: input.level || 100,
      departmentId: input.departmentId || null,
    },
  })
  return { ok: true }
}

export async function updateCourse(
  id: string,
  input: { code?: string; title?: string; creditUnits?: number; semester?: number; level?: number; departmentId?: string; lecturerId?: string | null }
): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.course.update({
    where: { id },
    data: {
      ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.creditUnits ? { creditUnits: input.creditUnits } : {}),
      ...(input.semester ? { semester: input.semester } : {}),
      ...(input.level ? { level: input.level } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId || null } : {}),
      ...(input.lecturerId !== undefined ? { lecturerId: input.lecturerId || null } : {}),
    },
  })
  return { ok: true }
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const inUse = await db.result.count({ where: { courseId: id } })
  if (inUse > 0) return { ok: false, error: `Cannot delete: ${inUse} result entries reference this course.` }
  await db.timetable.deleteMany({ where: { courseId: id } })
  await db.course.delete({ where: { id } })
  return { ok: true }
}

// ---------- Results upload ----------
export async function getResultUploadContext(departmentId?: string, level?: number, semester?: number) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  const deptId = departmentId || departments[0]?.id

  const courses = await db.course.findMany({
    where: {
      ...(deptId ? { OR: [{ departmentId: deptId }, { departmentId: null }] } : {}),
      ...(level ? { level } : { level: 100 }),
      ...(semester ? { semester } : { semester: 1 }),
    },
    orderBy: { code: 'asc' },
  })
  const students = await db.student.findMany({
    where: { ...(deptId ? { departmentId: deptId } : {}), ...(level ? { level } : { level: 100 }), status: 'ACTIVE' },
    orderBy: { lastName: 'asc' },
    select: { id: true, matricNo: true, firstName: true, lastName: true, otherName: true },
  })
  return {
    session: settings?.currentSession || '',
    semester: settings?.currentSemester || 1,
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
    courses: courses.map((c) => ({ id: c.id, code: c.code, title: c.title, creditUnits: c.creditUnits })),
    students: students.map((s) => ({
      id: s.id,
      matricNo: s.matricNo,
      fullName: [s.firstName, s.otherName, s.lastName].filter(Boolean).join(' '),
    })),
  }
}

export async function getExistingResults(courseId: string, session: string, semester: number) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const results = await db.result.findMany({
    where: { courseId, session, semester },
    include: { student: { select: { id: true, matricNo: true } } },
  })
  return { results: results.map((r) => ({ studentId: r.studentId, caScore: r.caScore, examScore: r.examScore, total: r.total, grade: r.grade })) }
}

export async function saveResults(
  courseId: string,
  session: string,
  semester: number,
  entries: Array<{ studentId: string; caScore: number; examScore: number }>
): Promise<ActionResult<{ saved: number }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!courseId || !session) return { ok: false, error: 'Course and session are required.' }

  const course = await db.course.findUnique({ where: { id: courseId } })
  if (!course) return { ok: false, error: 'Course not found.' }

  let saved = 0
  for (const e of entries) {
    const ca = Math.max(0, Math.min(40, Number(e.caScore) || 0))
    const exam = Math.max(0, Math.min(60, Number(e.examScore) || 0))
    const total = ca + exam
    const { grade, point } = computeGrade(total)
    await db.result.upsert({
      where: { studentId_courseId_session_semester: { studentId: e.studentId, courseId, session, semester } },
      update: { caScore: ca, examScore: exam, total, grade, gradePoint: point },
      create: { studentId: e.studentId, courseId, session, semester, caScore: ca, examScore: exam, total, grade, gradePoint: point },
    })
    saved++
  }
  return { ok: true, data: { saved } }
}

export async function deleteResults(courseId: string, session: string, semester: number): Promise<ActionResult<{ deleted: number }>> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  const res = await db.result.deleteMany({ where: { courseId, session, semester } })
  return { ok: true, data: { deleted: res.count } }
}
