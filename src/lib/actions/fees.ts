'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import type { ActionResult } from './auth'

// ---------- Fee structures ----------
export async function getFeeStructures(session?: string) {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const sess = session || settings?.currentSession || ''
  const items = await db.feeStructure.findMany({
    where: { session: sess },
    include: { department: { select: { name: true, code: true } } },
    orderBy: [{ departmentId: 'asc' }, { level: 'asc' }, { itemName: 'asc' }],
  })
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })
  return {
    session: sess,
    items: items.map((f) => ({
      id: f.id,
      session: f.session,
      level: f.level,
      department: f.department.name,
      departmentId: f.departmentId,
      itemName: f.itemName,
      amount: f.amount,
    })),
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
  }
}

export async function createFeeItem(input: {
  session: string
  departmentId: string
  level: number
  itemName: string
  amount: number
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.session || !input.departmentId || !input.itemName?.trim()) {
    return { ok: false, error: 'Session, department and item name are required.' }
  }
  if (!input.amount || input.amount <= 0) return { ok: false, error: 'Amount must be greater than zero.' }
  const existing = await db.feeStructure.findUnique({
    where: {
      session_level_departmentId_itemName: {
        session: input.session,
        level: input.level,
        departmentId: input.departmentId,
        itemName: input.itemName.trim(),
      },
    },
  })
  if (existing) return { ok: false, error: 'This fee item already exists for that department/level/session.' }
  await db.feeStructure.create({
    data: {
      session: input.session,
      departmentId: input.departmentId,
      level: input.level,
      itemName: input.itemName.trim(),
      amount: input.amount,
    },
  })
  return { ok: true }
}

export async function updateFeeItem(id: string, itemName?: string, amount?: number): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.feeStructure.update({
    where: { id },
    data: {
      ...(itemName ? { itemName: itemName.trim() } : {}),
      ...(amount !== undefined && amount > 0 ? { amount } : {}),
    },
  })
  return { ok: true }
}

export async function deleteFeeItem(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.feeStructure.delete({ where: { id } })
  return { ok: true }
}

// ---------- Payments ----------
export async function getPayments(filters?: { session?: string }) {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const sess = filters?.session || settings?.currentSession || ''
  const payments = await db.payment.findMany({
    where: { session: sess },
    include: {
      student: { select: { matricNo: true, firstName: true, lastName: true, level: true, departmentId: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return {
    session: sess,
    payments: payments.map((p) => ({
      id: p.id,
      matricNo: p.student.matricNo,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      level: p.student.level,
      department: p.student.department.name,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      note: p.note,
      createdAt: p.createdAt,
    })),
    totals: {
      collected: payments.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
    },
  }
}

export async function recordPayment(input: {
  matricNo: string
  session: string
  amount: number
  method: string
  reference?: string
  note?: string
}): Promise<ActionResult<{ receiptNo: string; student: string }>> {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const matric = (input.matricNo || '').trim().toUpperCase()
  if (!matric) return { ok: false, error: 'Student matric number is required.' }
  const student = await db.student.findUnique({ where: { matricNo: matric } })
  if (!student) return { ok: false, error: `No student found with matric number ${matric}.` }
  if (!input.amount || input.amount <= 0) return { ok: false, error: 'Amount must be greater than zero.' }

  const payment = await db.payment.create({
    data: {
      studentId: student.id,
      session: input.session,
      amount: input.amount,
      method: input.method || 'CASH',
      reference: input.reference?.trim() || null,
      note: input.note?.trim() || null,
      recordedById: guard.session.id,
    },
  })
  return {
    ok: true,
    data: {
      receiptNo: `RCP-${payment.id.slice(-8).toUpperCase()}`,
      student: `${student.firstName} ${student.lastName} (${student.matricNo})`,
    },
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST'])
  if (!guard.session) return { ok: false, error: guard.error }
  await db.payment.delete({ where: { id } })
  return { ok: true }
}

// ---------- Balances ----------
export async function getFeeBalances(filters?: { session?: string; departmentId?: string; level?: number }) {
  const guard = await requireAdmin(['PROVOST', 'BURSAR'])
  if (!guard.session) return { error: guard.error }
  const settings = await db.setting.findUnique({ where: { id: 'main' } })
  const sess = filters?.session || settings?.currentSession || ''
  const students = await db.student.findMany({
    where: {
      status: 'ACTIVE',
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters?.level ? { level: filters.level } : {}),
    },
    include: {
      department: { select: { name: true } },
      payments: { where: { session: sess } },
    },
    orderBy: { lastName: 'asc' },
  })
  const rows: Array<{
    studentId: string
    matricNo: string
    fullName: string
    department: string
    level: number
    payable: number
    paid: number
    balance: number
    phone: string | null
    email: string | null
  }> = []
  for (const s of students) {
    const items = await db.feeStructure.findMany({
      where: { session: sess, departmentId: s.departmentId, level: s.level },
    })
    const payable = items.reduce((a, b) => a + b.amount, 0)
    const paid = s.payments.reduce((a, b) => a + b.amount, 0)
    rows.push({
      studentId: s.id,
      matricNo: s.matricNo,
      fullName: `${s.firstName} ${s.lastName}`,
      department: s.department.name,
      level: s.level,
      payable,
      paid,
      balance: payable - paid,
      phone: s.phone,
      email: s.email,
    })
  }
  const totals = {
    payable: rows.reduce((a, b) => a + b.payable, 0),
    paid: rows.reduce((a, b) => a + b.paid, 0),
    outstanding: rows.reduce((a, b) => a + Math.max(0, b.balance), 0),
    fullyPaid: rows.filter((r) => r.balance <= 0).length,
    owing: rows.filter((r) => r.balance > 0).length,
  }
  return { session: sess, rows, totals }
}
