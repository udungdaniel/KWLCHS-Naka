'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Loader2, Plus, Search, Trash2, TrendingUp, UserPen } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  createStudent,
  deleteStudent,
  getStudents,
  promoteStudents,
  resetStudentPassword,
  updateStudent,
} from '@/lib/actions/students'
import { formatDate, naira } from '@/lib/format'
import { GENDERS, LEVELS, STUDENT_STATUSES, levelLabel } from '@/lib/constants'
import { ConfirmAction, EmptyState, Field, ImageInput, LoadingBlock, PageHeader, StatusBadge } from '@/components/shared/widgets'
import type { AdminRole } from '@/lib/constants'

type Dept = { id: string; name: string; code: string }
type Row = {
  id: string; matricNo: string; fullName: string; gender: string; dob: string | null
  email: string | null; phone: string | null; address: string | null; stateOfOrigin: string | null
  department: string; departmentId?: string; departmentCode: string; level: number; status: string
  photo: string | null; balance: number
}

const emptyForm = {
  firstName: '', lastName: '', otherName: '', gender: '', dob: '', email: '', phone: '', address: '',
  stateOfOrigin: '', departmentId: '', level: '100', status: 'ACTIVE', photo: '' as string | null, password: '',
}

export function StudentsModule({ role }: { role: AdminRole }) {
  const [data, setData] = useState<{ students: Row[]; departments: Dept[] } | null>(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ q: '', departmentId: 'ALL', level: 'ALL', status: 'ALL' })
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [detail, setDetail] = useState<Row | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [created, setCreated] = useState<{ matricNo: string; password: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res: any = await getStudents({
      ...(filters.departmentId !== 'ALL' ? { departmentId: filters.departmentId } : {}),
      ...(filters.level !== 'ALL' ? { level: Number(filters.level) } : {}),
      ...(filters.status !== 'ALL' ? { status: filters.status } : {}),
      q: filters.q,
    })
    if (res.error) setError(res.error)
    else setData({ students: res.students, departments: res.departments })
    setLoading(false)
  }, [filters.departmentId, filters.level, filters.status, filters.q])

  useEffect(() => { load() }, [load])

  const openEdit = (r: Row) => {
    setForm({
      firstName: r.fullName.split(' ').slice(0, 1).join(' '),
      lastName: r.fullName.split(' ').slice(-1).join(' '),
      otherName: '',
      gender: r.gender || '', dob: r.dob || '', email: r.email || '', phone: r.phone || '',
      address: r.address || '', stateOfOrigin: r.stateOfOrigin || '', departmentId: r.departmentId || '',
      level: String(r.level), status: r.status, photo: r.photo || '', password: '',
    })
    setEditRow(r)
  }

  const saveForm = async () => {
    setBusy(true)
    const payload = { ...form, level: Number(form.level) }
    const res = editRow
      ? await updateStudent(editRow.id, payload)
      : await createStudent(payload)
    setBusy(false)
    if (res.ok) {
      if (!editRow && 'data' in res && res.data) setCreated({ matricNo: (res as any).data.matricNo, password: (res as any).data.password })
      else toast.success('Student updated')
      setAddOpen(false)
      setEditRow(null)
      load()
    } else {
      toast.error(res.error)
    }
  }

  const formFields = (isEdit: boolean) => (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto thin-scroll pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First Name *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
        <Field label="Last Name *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        <Field label="Other Name"><Input value={form.otherName} onChange={(e) => setForm({ ...form, otherName: e.target.value })} /></Field>
        <Field label="Gender *">
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
        <Field label="State of Origin"><Input value={form.stateOfOrigin} onChange={(e) => setForm({ ...form, stateOfOrigin: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Department *">
          <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Level *">
          <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STUDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {!isEdit && <Field label="Initial Password (optional)"><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Auto-generated if empty" /></Field>}
      </div>
      <Field label="Contact Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <ImageInput label="Passport photo" value={form.photo} onChange={(v) => setForm({ ...form, photo: v })} hint="Optional. Auto-resized." />
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description="Manage student records, levels and status. Balance shown is for the current session."
        actions={
          <Button onClick={() => { setForm(emptyForm); setEditRow(null); setAddOpen(true); setCreated(null) }}>
            <Plus className="size-4" /> Add Student
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search name, matric no or phone…" className="pl-8" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            </div>
            <Select value={filters.departmentId} onValueChange={(v) => setFilters({ ...filters, departmentId: v })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All departments</SelectItem>{data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.level} onValueChange={(v) => setFilters({ ...filters, level: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All levels</SelectItem>{LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All statuses</SelectItem>{STUDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {selected.size > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <span>{selected.size} student(s) selected</span>
              <Button
                size="sm" variant="outline" onClick={async () => {
                  const res = await promoteStudents(Array.from(selected))
                  if (res.ok) { toast.success(`Promoted ${res.data!.count} student(s)`); setSelected(new Set()); load() }
                  else toast.error(res.error)
                }}
              >
                <TrendingUp className="size-4" /> Promote to next level
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

          {loading || !data ? (
            <LoadingBlock />
          ) : error ? (
            <div className="mt-4"><EmptyState title={error} /></div>
          ) : (
            <div className="mt-4 max-h-[560px] overflow-y-auto thin-scroll overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium"><input type="checkbox" aria-label="Select all" checked={data.students.length > 0 && selected.size === data.students.length} onChange={(e) => setSelected(e.target.checked ? new Set(data.students.map((s) => s.id)) : new Set())} /></th>
                    <th className="py-2 pr-3 font-medium">Student</th>
                    <th className="py-2 pr-3 font-medium">Department</th>
                    <th className="py-2 pr-3 font-medium">Level</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Balance</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-2"><input type="checkbox" aria-label={`Select ${s.fullName}`} checked={selected.has(s.id)} onChange={(e) => { const n = new Set(selected); if (e.target.checked) n.add(s.id); else n.delete(s.id); setSelected(n) }} /></td>
                      <td className="py-2.5 pr-3">
                        <button className="flex items-center gap-2.5 text-left" onClick={() => setDetail(s)}>
                          {s.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.photo} alt="" className="size-8 rounded-full object-cover border" />
                          ) : (
                            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{s.fullName.charAt(0)}</span>
                          )}
                          <span>
                            <span className="block font-medium">{s.fullName}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{s.matricNo}</span>
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 pr-3">{s.departmentCode}</td>
                      <td className="py-2.5 pr-3">{levelLabel(s.level)}</td>
                      <td className="py-2.5 pr-3"><StatusBadge status={s.status} /></td>
                      <td className={`py-2.5 pr-3 font-medium tabular-nums ${s.balance > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>{naira(s.balance)}</td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-7" title="Edit" onClick={() => openEdit(s)}><UserPen className="size-3.5" /></Button>
                          <Button
                            variant="ghost" size="icon" className="size-7" title="Reset password"
                            onClick={async () => {
                              const res = await resetStudentPassword(s.id)
                              if (res.ok) toast.success(`New password for ${s.fullName}: ${res.data!.password}`, { duration: 10000 })
                              else toast.error(res.error)
                            }}
                          >
                            <KeyRound className="size-3.5" />
                          </Button>
                          {role === 'PROVOST' && (
                            <ConfirmAction
                              trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600" title="Delete"><Trash2 className="size-3.5" /></Button>}
                              title="Delete student?"
                              description={`This permanently deletes ${s.fullName} (${s.matricNo}) including results and payments.`}
                              confirmLabel="Delete"
                              onConfirm={async () => {
                                const res = await deleteStudent(s.id)
                                if (res.ok) { toast.success('Student deleted'); load() } else toast.error(res.error)
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.students.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No students match the filters.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4 py-2 text-center">
              <p className="text-sm text-muted-foreground">Student created. Matriculation number and initial password:</p>
              <div className="rounded-lg border bg-emerald-50 px-4 py-3">
                <p className="font-mono font-bold text-emerald-900">{created.matricNo}</p>
                <p className="mt-1 font-mono text-sm text-emerald-800">Password: {created.password}</p>
              </div>
              <p className="text-xs text-muted-foreground">Give these to the student. They must change the password after first login.</p>
              <DialogFooter className="justify-center">
                <Button onClick={() => { setAddOpen(false); setCreated(null) }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              {formFields(false)}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button disabled={busy} onClick={saveForm}>{busy && <Loader2 className="size-4 animate-spin" />} Create Student</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(v) => !v && setEditRow(null)}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Edit — {editRow?.fullName} ({editRow?.matricNo})</DialogTitle></DialogHeader>
          {editRow && formFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button disabled={busy} onClick={saveForm}>{busy && <Loader2 className="size-4 animate-spin" />} Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{detail?.fullName}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-4">
                {detail.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.photo} alt="" className="size-16 rounded-lg border object-cover" />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">No photo</span>
                )}
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{detail.matricNo}</p>
                  <div className="mt-1 flex gap-2"><StatusBadge status={detail.status} /><Badge variant="outline">{levelLabel(detail.level)}</Badge></div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">Department:</span> {detail.department}</p>
                <p><span className="text-muted-foreground">Gender:</span> {detail.gender}</p>
                <p><span className="text-muted-foreground">DoB:</span> {detail.dob ? formatDate(detail.dob) : '—'}</p>
                <p><span className="text-muted-foreground">State:</span> {detail.stateOfOrigin || '—'}</p>
                <p><span className="text-muted-foreground">Phone:</span> {detail.phone || '—'}</p>
                <p><span className="text-muted-foreground">Email:</span> {detail.email || '—'}</p>
                <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {detail.address || '—'}</p>
                <p><span className="text-muted-foreground">Session balance:</span> <span className="font-medium">{naira(detail.balance)}</span></p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
