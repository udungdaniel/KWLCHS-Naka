'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, BookPlus, Loader2, Library, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBook, deleteBook, getBooks, issueBook, returnBook, updateBook } from '@/lib/actions/library'
import { formatDate } from '@/lib/format'
import { ConfirmAction, EmptyState, Field, LoadingBlock, PageHeader } from '@/components/shared/widgets'

const emptyBook = { title: '', author: '', isbn: '', category: '', copiesTotal: '1', shelfLocation: '' }

export function LibraryModule() {
  return (
    <div className="space-y-5">
      <PageHeader title="Library" description="Manage the book catalogue and issue/return loans to students and staff." />
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books" className="gap-1.5"><Library className="size-4" /> Catalogue</TabsTrigger>
          <TabsTrigger value="loans" className="gap-1.5"><ArrowLeftRight className="size-4" /> Loans</TabsTrigger>
        </TabsList>
        <TabsContent value="books"><Books /></TabsContent>
        <TabsContent value="loans"><Loans /></TabsContent>
      </Tabs>
    </div>
  )
}

function Books() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editRow, setEditRow] = useState<any>(null)
  const [form, setForm] = useState(emptyBook)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getBooks()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setBusy(true)
    const payload = { ...form, copiesTotal: Number(form.copiesTotal) || 1 }
    const res: any = editRow ? await updateBook(editRow.id, payload) : await createBook(payload)
    setBusy(false)
    if (res.ok) {
      toast.success(editRow ? 'Book updated' : 'Book added to catalogue')
      setOpen(false); setEditRow(null); load()
    } else {
      toast.error(res.error)
    }
  }

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{data.books.length} book(s) in catalogue</p>
          <Button onClick={() => { setForm(emptyBook); setEditRow(null); setOpen(true) }}><BookPlus className="size-4" /> Add Book</Button>
        </div>
        <div className="mt-4 max-h-[520px] overflow-y-auto thin-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Author</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Shelf</th>
                <th className="py-2 pr-3 font-medium">Available</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.books.map((b: any) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pr-3 font-medium">{b.title}</td>
                  <td className="py-2.5 pr-3">{b.author}</td>
                  <td className="py-2.5 pr-3">{b.category || '—'}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{b.shelfLocation || '—'}</td>
                  <td className="py-2.5 pr-3">
                    <span className={b.copiesAvailable > 0 ? 'text-emerald-700 font-medium' : 'text-red-600'}>
                      {b.copiesAvailable} / {b.copiesTotal}
                    </span>
                    {b.activeLoans > 0 && <Badge variant="outline" className="ml-2 text-[11px]">{b.activeLoans} out</Badge>}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                        setForm({ title: b.title, author: b.author, isbn: b.isbn || '', category: b.category || '', copiesTotal: String(b.copiesTotal), shelfLocation: b.shelfLocation || '' })
                        setEditRow(b); setOpen(true)
                      }}>Edit</Button>
                      <ConfirmAction
                        trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600"><Trash2 className="size-3.5" /></Button>}
                        title="Delete book?"
                        description={`Delete "${b.title}" from the catalogue? Books on loan cannot be deleted.`}
                        confirmLabel="Delete"
                        onConfirm={async () => {
                          const res = await deleteBook(b.id)
                          if (res.ok) { toast.success('Book deleted'); load() } else toast.error(res.error)
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {data.books.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No books yet. Add your first book.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editRow ? `Edit — ${editRow.title}` : 'Add Book'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Title *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Author *"><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
              <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Community Health" /></Field>
              <Field label="ISBN"><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></Field>
              <Field label="Shelf Location"><Input value={form.shelfLocation} onChange={(e) => setForm({ ...form, shelfLocation: e.target.value })} placeholder="e.g. CH-3" /></Field>
            </div>
            <Field label="Total Copies"><Input type="number" min={1} value={form.copiesTotal} onChange={(e) => setForm({ ...form, copiesTotal: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={save}>{busy && <Loader2 className="size-4 animate-spin" />} {editRow ? 'Save' : 'Add Book'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function Loans() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ bookId: '', borrowerType: 'STUDENT', borrowerRef: '', borrowerName: '', dueDate: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getBooks()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  const due = new Date()
  due.setDate(due.getDate() + 14)
  const defaultDue = due.toISOString().slice(0, 10)
  const books = data.books

  return (
    <>
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{data.loans.filter((l: any) => l.status === 'ACTIVE').length} active loan(s)</p>
            <Button onClick={() => { setForm({ bookId: books[0]?.id || '', borrowerType: 'STUDENT', borrowerRef: '', borrowerName: '', dueDate: defaultDue }); setOpen(true) }}>
              <Plus className="size-4" /> Issue Book
            </Button>
          </div>
          <div className="mt-4 max-h-[520px] overflow-y-auto thin-scroll overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Book</th>
                  <th className="py-2 pr-3 font-medium">Borrower</th>
                  <th className="py-2 pr-3 font-medium">Borrowed</th>
                  <th className="py-2 pr-3 font-medium">Due</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.loans.map((l: any) => {
                  const overdue = l.status === 'ACTIVE' && new Date(l.dueDate) < new Date()
                  return (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3 font-medium">{l.bookTitle}</td>
                      <td className="py-2.5 pr-3">
                        {l.borrowerName}
                        <span className="block font-mono text-xs text-muted-foreground">{l.borrowerRef} · {l.borrowerType}</span>
                      </td>
                      <td className="py-2.5 pr-3">{formatDate(l.borrowedAt)}</td>
                      <td className={`py-2.5 pr-3 ${overdue ? 'text-red-600 font-medium' : ''}`}>{formatDate(l.dueDate)}{overdue && ' (overdue)'}</td>
                      <td className="py-2.5 pr-3">
                        <Badge className={l.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>
                          {l.status === 'ACTIVE' ? 'On loan' : 'Returned'}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        {l.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={async () => {
                              const res = await returnBook(l.id)
                              if (res.ok) { toast.success('Book returned'); load() } else toast.error(res.error)
                            }}
                          >
                            Mark returned
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {data.loans.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No loans yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Book *">
              <Select value={form.bookId} onValueChange={(v) => setForm({ ...form, bookId: v })}>
                <SelectTrigger><SelectValue placeholder="Select book" /></SelectTrigger>
                <SelectContent>
                  {books.map((b: any) => (
                    <SelectItem key={b.id} value={b.id} disabled={b.copiesAvailable < 1}>
                      {b.title} {b.copiesAvailable < 1 ? '(no copies)' : `(${b.copiesAvailable} avail.)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Borrower Type">
                <Select value={form.borrowerType} onValueChange={(v) => setForm({ ...form, borrowerType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Due Date *"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            </div>
            <Field label={form.borrowerType === 'STUDENT' ? 'Matric Number *' : 'Staff Number *'}>
              <Input value={form.borrowerRef} onChange={(e) => setForm({ ...form, borrowerRef: e.target.value })} className="font-mono" placeholder={form.borrowerType === 'STUDENT' ? 'KWLCHS/2024/MLT/001' : 'KWLCHS/STF/2023/001'} />
            </Field>
            {form.borrowerType === 'STAFF' && (
              <Field label="Staff Name"><Input value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} placeholder="Full name of staff" /></Field>
            )}
            <p className="text-xs text-muted-foreground">Students are looked up by matric number; the name fills automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await issueBook({ ...form, borrowerName: form.borrowerName || undefined })
                setBusy(false)
                if (res.ok) { toast.success('Book issued'); setOpen(false); load() } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
