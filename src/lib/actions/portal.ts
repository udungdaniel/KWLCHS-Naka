'use server'

import { db } from '@/lib/db'
import { requireStudent } from '@/lib/session'
import type { ActionResult } from './auth'

// Student portal data — everything is scoped to the logged-in student

export async function getStudentDashboard() {
  const guard = await requireStudent()
  if (!guard.session) return { error: guard.error }
  const student = await db.student.findUnique({
    where: { id: guard.session.id },
    include: { department: true, payments: true, results: { include: { course: true } } },
  })
  if (!student) return { error: 'Account not found.' }

  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const session = settings?.currentSession || ''
  const obligations = await db.feeStructure.findMany({
    where: { session, departmentId: student.departmentId, level: student.level },
  })
  const payable = obligations.reduce((s, o) => s + o.amount, 0)
  const paid = student.payments.filter((p) => p.session === session).reduce((s, p) => s + p.amount, 0)

  const announcements = await db.announcement.findMany({
    where: { audience: { in: ['STUDENTS', 'BOTH'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // CGPA over all results
  const totalPoints = student.results.reduce((s, r) => s + r.gradePoint * r.course.creditUnits, 0)
  const totalUnits = student.results.reduce((s, r) => s + r.course.creditUnits, 0)
  const cgpa = totalUnits > 0 ? totalPoints / totalUnits : 0

  const activeLoans = await db.bookLoan.count({ where: { studentId: student.id, status: 'ACTIVE' } })

  return {
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      matricNo: student.matricNo,
      level: student.level,
      department: student.department.name,
      photo: student.photo,
      status: student.status,
    },
    session,
    semester: settings?.currentSemester || 1,
    fees: { payable, paid, balance: payable - paid },
    cgpa,
    resultsCount: student.results.length,
    activeLoans,
    announcements,
  }
}

export async function getStudentResults(session?: string, semester?: number) {
  const guard = await requireStudent()
  if (!guard.session) return { error: guard.error }
  const student = await db.student.findUnique({ where: { id: guard.session.id } })
  if (!student) return { error: 'Account not found.' }

  const results = await db.result.findMany({
    where: { studentId: student.id, ...(session ? { session } : {}), ...(semester ? { semester } : {}) },
    include: { course: { include: { department: true } } },
    orderBy: [{ session: 'desc' }, { semester: 'desc' }, { course: { code: 'asc' } }],
  })

  // sessions + semesters the student has results for
  const pairs = await db.result.findMany({
    where: { studentId: student.id },
    distinct: ['session', 'semester'],
    select: { session: true, semester: true },
  })

  // group GPA by session+semester
  const groups = new Map<string, { points: number; units: number }>()
  for (const r of results) {
    const key = `${r.session}|${r.semester}`
    const g = groups.get(key) || { points: 0, units: 0 }
    g.points += r.gradePoint * r.course.creditUnits
    g.units += r.course.creditUnits
    groups.set(key, g)
  }
  const semesterGPAs = Array.from(groups.entries()).map(([key, g]) => {
    const [sess, sem] = key.split('|')
    return { session: sess, semester: Number(sem), gpa: g.units > 0 ? g.points / g.units : 0 }
  })

  const totalPoints = results.reduce((s, r) => s + r.gradePoint * r.course.creditUnits, 0)
  const totalUnits = results.reduce((s, r) => s + r.course.creditUnits, 0)

  return {
    results: results.map((r) => ({
      id: r.id,
      courseCode: r.course.code,
      courseTitle: r.course.title,
      creditUnits: r.course.creditUnits,
      semester: r.semester,
      session: r.session,
      caScore: r.caScore,
      examScore: r.examScore,
      total: r.total,
      grade: r.grade,
      gradePoint: r.gradePoint,
    })),
    periods: pairs.sort((a, b) => b.session.localeCompare(a.session) || b.semester - a.semester),
    semesterGPAs,
    cgpa: totalUnits > 0 ? totalPoints / totalUnits : 0,
  }
}

export async function getStudentFees() {
  const guard = await requireStudent()
  if (!guard.session) return { error: guard.error }
  const student = await db.student.findUnique({
    where: { id: guard.session.id },
    include: { department: true, payments: { orderBy: { createdAt: 'desc' } } },
  })
  if (!student) return { error: 'Account not found.' }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const session = settings?.currentSession || ''

  const feeItems = await db.feeStructure.findMany({
    where: { session, departmentId: student.departmentId, level: student.level },
    orderBy: { itemName: 'asc' },
  })
  const payable = feeItems.reduce((s, f) => s + f.amount, 0)
  const paid = student.payments.filter((p) => p.session === session).reduce((s, p) => s + p.amount, 0)

  return {
    session,
    level: student.level,
    department: student.department.name,
    feeItems: feeItems.map((f) => ({ itemName: f.itemName, amount: f.amount })),
    payable,
    paid,
    balance: payable - paid,
    payments: student.payments.map((p) => ({
      id: p.id,
      session: p.session,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      createdAt: p.createdAt,
    })),
  }
}

export async function getStudentTimetable() {
  const guard = await requireStudent()
  if (!guard.session) return { error: guard.error }
  const student = await db.student.findUnique({ where: { id: guard.session.id } })
  if (!student) return { error: 'Account not found.' }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })

  const entries = await db.timetable.findMany({
    where: {
      departmentId: student.departmentId,
      level: student.level,
      session: settings?.currentSession || '',
      semester: settings?.currentSemester || 1,
    },
    include: {
      course: { select: { code: true, title: true } },
      lecturer: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
  })
  return {
    session: settings?.currentSession || '',
    semester: settings?.currentSemester || 1,
    entries: entries.map((e) => ({
      id: e.id,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      lecturer: e.lecturer ? `${e.lecturer.firstName} ${e.lecturer.lastName}` : null,
      room: e.room,
    })),
  }
}

export async function getStudentLibrary() {
  const guard = await requireStudent()
  if (!guard.session) return { error: guard.error }
  const books = await db.book.findMany({ orderBy: { title: 'asc' } })
  const loans = await db.bookLoan.findMany({
    where: { OR: [{ studentId: guard.session.id }, { borrowerRef: guard.session.ref || '' }] },
    include: { book: { select: { title: true, author: true } } },
    orderBy: { borrowedAt: 'desc' },
  })
  return {
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      available: b.copiesAvailable,
      total: b.copiesTotal,
      shelfLocation: b.shelfLocation,
    })),
    loans: loans.map((l) => ({
      id: l.id,
      title: l.book.title,
      author: l.book.author,
      borrowedAt: l.borrowedAt,
      dueDate: l.dueDate,
      status: l.status,
    })),
  }
}

export async function updateStudentProfile(input: {
  email?: string
  phone?: string
  address?: string
  photo?: string | null
}): Promise<ActionResult> {
  const guard = await requireStudent()
  if (!guard.session) return { ok: false, error: guard.error }
  if (input.photo && input.photo.length > 500_000) {
    return { ok: false, error: 'Photo is too large. Please use an image under 400KB.' }
  }
  await db.student.update({
    where: { id: guard.session.id },
    data: {
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      ...(input.photo ? { photo: input.photo } : {}),
    },
  })
  return { ok: true }
}

export async function getStudentProfile() {
  const guard = await requireStudent()
  if (!guard.session) return { error: guard.error }
  const student = await db.student.findUnique({
    where: { id: guard.session.id },
    include: { department: { select: { name: true } } },
  })
  if (!student) return { error: 'Account not found.' }
  return {
    matricNo: student.matricNo,
    firstName: student.firstName,
    lastName: student.lastName,
    otherName: student.otherName,
    gender: student.gender,
    dob: student.dob,
    email: student.email,
    phone: student.phone,
    address: student.address,
    stateOfOrigin: student.stateOfOrigin,
    level: student.level,
    department: student.department.name,
    status: student.status,
    photo: student.photo,
  }
}
