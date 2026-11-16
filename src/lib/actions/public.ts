'use server'

import { db } from '@/lib/db'
import { phoneToWaIntl } from '@/lib/constants'

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

// ---------- Public data ----------
export async function getPublicData() {
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const departments = await db.department.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true, description: true },
  })
  const announcements = await db.announcement.findMany({
    where: { audience: { in: ['STUDENTS', 'BOTH'] } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
  const [studentCount, staffCount] = await Promise.all([
    db.student.count({ where: { status: 'ACTIVE' } }),
    db.staff.count({ where: { status: 'ACTIVE' } }),
  ])
  return {
    settings,
    departments,
    announcements,
    stats: { students: studentCount, staff: staffCount, departments: departments.length },
  }
}

// ---------- Online admission application ----------
export type ApplicationInput = {
  firstName: string
  lastName: string
  otherName?: string
  gender: string
  dob?: string
  email?: string
  phone: string
  address?: string
  stateOfOrigin?: string
  departmentId: string
  examType?: string
  examYear?: string
  examNo?: string
  subjects?: Array<{ subject: string; grade: string }>
  passport?: string
}

export async function submitApplication(input: ApplicationInput): Promise<ActionResult<{ applicationNo: string }>> {
  if (!input.firstName?.trim() || !input.lastName?.trim()) return { ok: false, error: 'First and last name are required.' }
  if (!input.gender) return { ok: false, error: 'Gender is required.' }
  if (!input.phone?.trim()) return { ok: false, error: 'Phone number is required.' }
  if (!input.departmentId) return { ok: false, error: 'Please choose a programme/department.' }

  const dept = await db.department.findUnique({ where: { id: input.departmentId } })
  if (!dept) return { ok: false, error: 'Selected department does not exist.' }

  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  if (settings && !settings.admissionOpen) {
    return { ok: false, error: 'Admission applications are currently closed. Please check back later.' }
  }

  const year = new Date().getFullYear()
  const count = await db.application.count()
  const applicationNo = `KWLCHS/APP/${year}/${String(count + 1).padStart(4, '0')}`

  await db.application.create({
    data: {
      applicationNo,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      otherName: input.otherName?.trim() || null,
      gender: input.gender,
      dob: input.dob || null,
      email: input.email?.trim() || null,
      phone: input.phone.trim(),
      address: input.address?.trim() || null,
      stateOfOrigin: input.stateOfOrigin?.trim() || null,
      departmentId: input.departmentId,
      examType: input.examType || null,
      examYear: input.examYear || null,
      examNo: input.examNo || null,
      subjects: input.subjects ? JSON.stringify(input.subjects) : null,
      passport: input.passport || null,
    },
  })

  // Notify the admissions office on WhatsApp for follow-up
  if (settings?.whatsappLine) {
    const wa = phoneToWaIntl(settings.whatsappLine)
    if (wa) {
      await db.messageLog.create({
        data: {
          kind: 'WHATSAPP',
          recipientType: 'STAFF',
          recipientName: 'Admissions Desk',
          destination: `+${wa}`,
          subject: 'New admission application',
          body: `New application ${applicationNo}: ${input.lastName} ${input.firstName} applied for ${dept.name}.`,
          link: `https://wa.me/${wa}?text=${encodeURIComponent(`New admission application received: ${applicationNo} (${input.lastName} ${input.firstName}, ${dept.name})`)}`,
        },
      })
    }
  }

  return { ok: true, data: { applicationNo } }
}

export async function checkApplicationStatus(applicationNo: string) {
  const no = (applicationNo || '').trim().toUpperCase()
  if (!no) return { ok: false as const, error: 'Please enter your application number.' }
  const app = await db.application.findUnique({
    where: { applicationNo: no },
    include: { department: { select: { name: true, code: true } } },
  })
  if (!app) return { ok: false as const, error: 'No application found with that number. Check the number and try again.' }
  return {
    ok: true as const,
    data: {
      applicationNo: app.applicationNo,
      name: `${app.firstName} ${app.lastName}`,
      department: app.department.name,
      status: app.status,
      reviewNote: app.reviewNote,
      createdAt: app.createdAt,
    },
  }
}
