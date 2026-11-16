'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import type { ActionResult } from './auth'

export async function getBooks() {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { error: guard.error }
  const books = await db.book.findMany({
    include: { loans: { where: { status: 'ACTIVE' } } },
    orderBy: { title: 'asc' },
  })
  const loans = await db.bookLoan.findMany({
    include: { book: { select: { title: true, author: true } } },
    orderBy: { borrowedAt: 'desc' },
  })
  return {
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      copiesTotal: b.copiesTotal,
      copiesAvailable: b.copiesAvailable,
      shelfLocation: b.shelfLocation,
      activeLoans: b.loans.length,
    })),
    loans: loans.map((l) => ({
      id: l.id,
      bookTitle: l.book.title,
      bookId: l.bookId,
      borrowerType: l.borrowerType,
      borrowerRef: l.borrowerRef,
      borrowerName: l.borrowerName,
      borrowedAt: l.borrowedAt,
      dueDate: l.dueDate,
      status: l.status,
      returnedAt: l.returnedAt,
    })),
  }
}

export async function createBook(input: {
  title: string
  author: string
  isbn?: string
  category?: string
  copiesTotal: number
  shelfLocation?: string
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.title?.trim() || !input.author?.trim()) return { ok: false, error: 'Title and author are required.' }
  await db.book.create({
    data: {
      title: input.title.trim(),
      author: input.author.trim(),
      isbn: input.isbn?.trim() || null,
      category: input.category?.trim() || null,
      copiesTotal: Math.max(1, input.copiesTotal || 1),
      copiesAvailable: Math.max(1, input.copiesTotal || 1),
      shelfLocation: input.shelfLocation?.trim() || null,
    },
  })
  return { ok: true }
}

export async function updateBook(
  id: string,
  input: { title?: string; author?: string; isbn?: string; category?: string; shelfLocation?: string; copiesTotal?: number }
): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const book = await db.book.findUnique({ where: { id }, include: { loans: { where: { status: 'ACTIVE' } } } })
  if (!book) return { ok: false, error: 'Book not found.' }
  if (input.copiesTotal !== undefined) {
    const active = book.loans.length
    if (input.copiesTotal < active) {
      return { ok: false, error: `Cannot set total copies below ${active} (currently on loan).` }
    }
    const newAvailable = book.copiesAvailable + (input.copiesTotal - book.copiesTotal)
    await db.book.update({
      where: { id },
      data: {
        copiesTotal: input.copiesTotal,
        copiesAvailable: Math.max(0, newAvailable),
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.author ? { author: input.author.trim() } : {}),
        ...(input.isbn !== undefined ? { isbn: input.isbn?.trim() || null } : {}),
        ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
        ...(input.shelfLocation !== undefined ? { shelfLocation: input.shelfLocation?.trim() || null } : {}),
      },
    })
    return { ok: true }
  }
  await db.book.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.author ? { author: input.author.trim() } : {}),
      ...(input.isbn !== undefined ? { isbn: input.isbn?.trim() || null } : {}),
      ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
      ...(input.shelfLocation !== undefined ? { shelfLocation: input.shelfLocation?.trim() || null } : {}),
    },
  })
  return { ok: true }
}

export async function deleteBook(id: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const active = await db.bookLoan.count({ where: { bookId: id, status: 'ACTIVE' } })
  if (active > 0) return { ok: false, error: `Cannot delete: ${active} copy(ies) are currently on loan.` }
  await db.bookLoan.deleteMany({ where: { bookId: id } })
  await db.book.delete({ where: { id } })
  return { ok: true }
}

export async function issueBook(input: {
  bookId: string
  borrowerType: string
  borrowerRef: string
  borrowerName?: string
  dueDate: string
}): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  if (!input.bookId || !input.borrowerRef?.trim() || !input.dueDate) {
    return { ok: false, error: 'Book, borrower ID and due date are required.' }
  }
  const book = await db.book.findUnique({ where: { id: input.bookId } })
  if (!book) return { ok: false, error: 'Book not found.' }
  if (book.copiesAvailable < 1) return { ok: false, error: `No copies of "${book.title}" are currently available.` }

  let borrowerName = input.borrowerName?.trim() || ''
  let studentId: string | null = null
  if (input.borrowerType === 'STUDENT') {
    const student = await db.student.findUnique({ where: { matricNo: input.borrowerRef.trim().toUpperCase() } })
    if (!student) return { ok: false, error: `No student found with matric number ${input.borrowerRef}.` }
    borrowerName = borrowerName || `${student.firstName} ${student.lastName}`
    studentId = student.id
  }

  await db.bookLoan.create({
    data: {
      bookId: input.bookId,
      borrowerType: input.borrowerType,
      borrowerRef: input.borrowerRef.trim().toUpperCase(),
      borrowerName: borrowerName || input.borrowerRef,
      dueDate: input.dueDate,
      studentId,
    },
  })
  await db.book.update({ where: { id: input.bookId }, data: { copiesAvailable: { decrement: 1 } } })
  return { ok: true }
}

export async function returnBook(loanId: string): Promise<ActionResult> {
  const guard = await requireAdmin(['PROVOST', 'REGISTRAR'])
  if (!guard.session) return { ok: false, error: guard.error }
  const loan = await db.bookLoan.findUnique({ where: { id: loanId } })
  if (!loan) return { ok: false, error: 'Loan record not found.' }
  if (loan.status === 'RETURNED') return { ok: false, error: 'This book has already been returned.' }
  await db.bookLoan.update({ where: { id: loanId }, data: { status: 'RETURNED', returnedAt: new Date() } })
  await db.book.update({ where: { id: loan.bookId }, data: { copiesAvailable: { increment: 1 } } })
  return { ok: true }
}
