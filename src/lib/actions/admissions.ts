'use server'

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/session'
import type { ActionResult } from './auth'

export async function getApplications(status?: string) {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const apps = await db.application.findMany({
    where: status ? { status } : {},
    include: { department: { select: { name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  return {
    applications: apps.map((a) => ({
      id: a.id,
      applicationNo: a.applicationNo,
      fullName: [a.firstName, a.otherName, a.lastName].filter(Boolean).join(' '),
      gender: a.gender,
      dob: a.dob,
      email: a.email,
      phone: a.phone,
      address: a.address,
      stateOfOrigin: a.stateOfOrigin,
      department: a.department.name,
      departmentCode: a.department.code,
      departmentId: a.departmentId,
      examType: a.examType,
      examYear: a.examYear,
      examNo: a.examNo,
      subjects: a.subjects ? JSON.parse(a.subjects) : [],
      passport: a.passport,
      status: a.status,
      reviewNote: a.reviewNote,
      createdAt: a.createdAt,
    })),
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
    counts: {
      total: apps.length,
      pending: apps.filter((a) => a.status === 'PENDING').length,
      admitted: apps.filter((a) => a.status === 'ADMITTED').length,
      rejected: apps.filter((a) => a.status === 'REJECTED').length,
    },
  }
}

export async function admitApplication(id: string, departmentId?: string): Promise<ActionResult<{ matricNo: string; password: string }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }

  const app = await db.application.findUnique({ where: { id }, include: { department: true } })
  if (!app) return { ok: false, error: 'Application not found.' }
  if (app.status === 'ADMITTED') return { ok: false, error: 'This application has already been admitted.' }

  const deptId = departmentId || app.departmentId
  const dept = await db.department.findUnique({ where: { id: deptId } })
  if (!dept) return { ok: false, error: 'Department not found.' }

  const year = new Date().getFullYear()
  const seq = (await db.student.count({ where: { departmentId: dept.id } })) + 1
  let matricNo = `KWLCHS/${year}/${dept.code}/${String(seq).padStart(3, '0')}`
  let attempt = 1
  while (await db.student.findUnique({ where: { matricNo } })) {
    matricNo = `KWLCHS/${year}/${dept.code}/${String(seq + attempt).padStart(3, '0')}`
    attempt++
  }
  const password = `chs${Math.floor(1000 + Math.random() * 9000)}`

  await db.student.create({
    data: {
      matricNo,
      firstName: app.firstName,
      lastName: app.lastName,
      otherName: app.otherName,
      gender: app.gender,
      dob: app.dob,
      email: app.email,
      phone: app.phone,
      address: app.address,
      stateOfOrigin: app.stateOfOrigin,
      departmentId: dept.id,
      level: 100,
      status: 'ACTIVE',
      photo: app.passport,
      passwordHash: hashPassword(password),
    },
  })

  await db.application.update({
    where: { id },
    data: {
      status: 'ADMITTED',
      reviewedById: guard.session.id,
      reviewedAt: new Date(),
      reviewNote: app.reviewNote,
    },
  })

  return { ok: true, data: { matricNo, password } }
}

export async function rejectApplication(id: string, note?: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const app = await db.application.findUnique({ where: { id } })
  if (!app) return { ok: false, error: 'Application not found.' }
  await db.application.update({
    where: { id },
    data: { status: 'REJECTED', reviewNote: note || app.reviewNote, reviewedById: guard.session.id, reviewedAt: new Date() },
  })
  return { ok: true }
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.application.delete({ where: { id } })
  return { ok: true }
}
