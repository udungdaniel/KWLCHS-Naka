'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { levelLabel, phoneToWaIntl } from '@/lib/constants'
import { naira } from '@/lib/format'
import type { ActionResult } from './auth'

export async function getCommunicationData() {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR', 'BURSAR'])
  if (!guard.session) return { error: guard.error }
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const messages = await db.messageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const [studentCount, staffCount] = await Promise.all([
    db.student.count({ where: { status: 'ACTIVE', phone: { not: null } } }),
    db.staff.count({ where: { status: 'ACTIVE', OR: [{ phone: { not: null } }, { email: { not: null } }] } }),
  ])
  return {
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      createdAt: a.createdAt,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      kind: m.kind,
      recipientType: m.recipientType,
      recipientName: m.recipientName,
      destination: m.destination,
      subject: m.subject,
      body: m.body,
      link: m.link,
      opened: m.opened,
      createdAt: m.createdAt,
    })),
    recipients: { students: studentCount, staff: staffCount },
  }
}

export async function sendAnnouncement(input: {
  title: string
  body: string
  audience: 'STUDENTS' | 'STAFF' | 'BOTH'
  channels: Array<'WHATSAPP' | 'EMAIL'>
}): Promise<ActionResult<{ queued: number }>> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.title?.trim() || !input.body?.trim()) return { ok: false, error: 'Title and message body are required.' }
  if (!input.channels?.length) return { ok: false, error: 'Select at least one channel (WhatsApp or Email).' }

  await db.announcement.create({
    data: {
      title: input.title.trim(),
      body: input.body.trim(),
      audience: input.audience,
      createdById: guard.session.id,
    },
  })

  const audiences = input.audience === 'BOTH' ? ['STUDENTS', 'STAFF'] : [input.audience]
  let queued = 0

  for (const audience of audiences) {
    const recipients =
      audience === 'STUDENTS'
        ? await db.student.findMany({ where: { status: 'ACTIVE' } })
        : await db.staff.findMany({ where: { status: 'ACTIVE' } })

    for (const r of recipients) {
      const name = 'matricNo' in r ? `${r.firstName} ${r.lastName}` : `${r.firstName} ${r.lastName}`
      const email = r.email
      const phone = r.phone
      for (const channel of input.channels) {
        if (channel === 'WHATSAPP') {
          const wa = phone ? phoneToWaIntl(phone) : null
          if (wa) {
            const text = `${input.title.trim()}\n\n${input.body.trim()}\n\n— ${guard.session.name}, KWLCHS Naka`
            await db.messageLog.create({
              data: {
                kind: 'WHATSAPP',
                recipientType: audience === 'STUDENTS' ? 'STUDENT' : 'STAFF',
                recipientName: name,
                destination: `+${wa}`,
                subject: input.title.trim(),
                body: input.body.trim(),
                link: `https://wa.me/${wa}?text=${encodeURIComponent(text)}`,
                createdById: guard.session.id,
              },
            })
            queued++
          }
        } else if (channel === 'EMAIL' && email) {
          const text = `${input.body.trim()}\n\n— ${guard.session.name}, KWLCHS Naka`
          await db.messageLog.create({
            data: {
              kind: 'EMAIL',
              recipientType: audience === 'STUDENTS' ? 'STUDENT' : 'STAFF',
              recipientName: name,
              destination: email,
              subject: input.title.trim(),
              body: input.body.trim(),
              link: `mailto:${email}?subject=${encodeURIComponent(input.title.trim())}&body=${encodeURIComponent(text)}`,
              createdById: guard.session.id,
            },
          })
          queued++
        }
      }
    }
  }
  return { ok: true, data: { queued } }
}

// Fee reminders: generate WhatsApp/Email links for every student with an outstanding balance
export async function sendFeeReminders(session?: string): Promise<ActionResult<{ queued: number; totalOwed: number }>> {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const sess = session || settings?.currentSession || ''

  const students = await db.student.findMany({
    where: { status: 'ACTIVE' },
    include: { department: { select: { name: true } }, payments: { where: { session: sess } } },
  })
  let queued = 0
  let totalOwed = 0
  for (const s of students) {
    const items = await db.feeStructure.findMany({
      where: { session: sess, departmentId: s.departmentId, level: s.level },
    })
    const payable = items.reduce((a, b) => a + b.amount, 0)
    const paid = s.payments.reduce((a, b) => a + b.amount, 0)
    const balance = payable - paid
    if (balance <= 0) continue
    totalOwed += balance

    const name = `${s.firstName} ${s.lastName}`
    const text =
      `Dear ${name},\n\nThis is a reminder that your outstanding fees for the ${sess} academic session amount to ${naira(balance)}.\n\n` +
      `Programme: ${s.department.name} (${levelLabel(s.level)})\nPaid so far: ${naira(paid)}\nPlease complete payment at the Bursary.\n\n` +
      `— Bursar, KWLCHS Naka`

    if (s.phone) {
      const wa = phoneToWaIntl(s.phone)
      if (wa) {
        await db.messageLog.create({
          data: {
            kind: 'FEE_REMINDER',
            recipientType: 'STUDENT',
            recipientName: name,
            destination: `+${wa}`,
            subject: `Fee reminder — ${naira(balance)} outstanding`,
            body: text,
            link: `https://wa.me/${wa}?text=${encodeURIComponent(text)}`,
            createdById: guard.session.id,
          },
        })
        queued++
      }
    }
    if (s.email) {
      await db.messageLog.create({
        data: {
          kind: 'FEE_REMINDER',
          recipientType: 'STUDENT',
          recipientName: name,
          destination: s.email,
          subject: `Fee reminder — ${naira(balance)} outstanding (${sess})`,
          body: text,
          link: `mailto:${s.email}?subject=${encodeURIComponent(`Fee reminder — ${naira(balance)} outstanding (${sess})`)}&body=${encodeURIComponent(text)}`,
          createdById: guard.session.id,
        },
      })
      queued++
    }
  }
  return { ok: true, data: { queued, totalOwed } }
}

export async function markMessageOpened(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.messageLog.update({ where: { id }, data: { opened: true } })
  return { ok: true }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.announcement.delete({ where: { id } })
  return { ok: true }
}
