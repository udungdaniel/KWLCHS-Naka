'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, CalendarCheck, KeyRound, Loader2, Plus, Search, Trash2, UserPen } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { assignCourse, createStaff, deleteStaff, getAttendance, getStaff, markAttendance, markAllAttendance, updateStaff } from '@/lib/actions/staff'
import { getCourses } from '@/lib/actions/academics'
import { formatDate, naira, num, todayStr } from '@/lib/format'
import { ATTENDANCE_STATUSES, GENDERS, STAFF_RANKS } from '@/lib/constants'
import { ConfirmAction, EmptyState, Field, ImageInput, LoadingBlock, PageHeader, StatCard, StatusBadge } from '@/components/shared/widgets'
import type { AdminRole } from '@/lib/constants'

type Dept = { id: string; name: string; code: string }
type StaffRow = {
  id: string; staffNo: string; fullName: string; gender: string | null; dob: string | null
  email: string | null; phone: string | null; department: string | null; departmentId: string | null
  specialty: string | null; qualifications: string | null; rank: string; salary: number
  picture: string | null; status: string; employmentDate: string | null
  courses: Array<{ code: string; title: string }>; attendance: Array<{ date: string; status: string }>
}

const emptyForm = {
  firstName: '', lastName: '', otherName: '', gender: '', dob: '', email: '', phone: '',
  departmentId: '', specialty: '', qualifications: '', rank: '', salary: '', employmentDate: '',
  status: 'ACTIVE', picture: '' as string | null,
}

export function StaffModule({ role }: { role: AdminRole }) {
  const [data, setData] = useState<{ staff: StaffRow[]; departments: Dept[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [deptF, setDeptF] = useState('ALL')
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<StaffRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [attRow, setAttRow] = useState<StaffRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res: any = await getStaff({ q, ...(deptF !== 'ALL' ? { departmentId: deptF } : {}) })
    if (res.error) setError(res.error)
    else setData({ staff: res.staff, departments: res.departments })
    setLoading(false)
  }, [q, deptF])

  useEffect(() => { load() }, [load])

  const openEdit = (r: StaffRow) => {
    setForm({
      firstName: r.fullName.split(' ').slice(0, 1).join(' '),
      lastName: r.fullName.split(' ').slice(-1).join(' '),
      otherName: '', gender: r.gender || '', dob: r.dob || '', email: r.email || '', phone: r.phone || '',
      departmentId: r.departmentId || '', specialty: r.specialty || '', qualifications: r.qualifications || '',
      rank: r.rank, salary: String(r.salary), employmentDate: r.employmentDate || '', status: r.status,
      picture: r.picture || '',
    })
    setEditRow(r)
  }

  const saveForm = async () => {
    setBusy(true)
    const payload = { ...form, salary: Number(form.salary) || 0 }
    const res: any = editRow ? await updateStaff(editRow.id, payload) : await createStaff(payload)
    setBusy(false)
    if (res.ok) {
      if (!editRow && res.data) setCreated(res.data.staffNo)
      else toast.success('Staff record updated')
      if (!res.data) { setAddOpen(false); setEditRow(null) }
      load()
    } else {
      toast.error(res.error)
    }
  }

  const formFields = (
    <div className="space-y-4 max-h-[62vh] overflow-y-auto thin-scroll pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First Name *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
        <Field label="Last Name *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        <Field label="Other Name"><Input value={form.otherName} onChange={(e) => setForm({ ...form, otherName: e.target.value })} /></Field>
        <Field label="Gender">
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
        <Field label="Rank *">
          <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
            <SelectTrigger><SelectValue placeholder="Select rank" /></SelectTrigger>
            <SelectContent>{STAFF_RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Department">
          <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Specialty"><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Haematology" /></Field>
        <Field label="Qualifications"><Input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="e.g. B.Sc MLS, M.Sc Haematology" /></Field>
        <Field label="Monthly Salary (₦)"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Employment Date"><Input type="date" value={form.employmentDate} onChange={(e) => setForm({ ...form, employmentDate: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ACTIVE">ACTIVE</SelectItem><SelectItem value="SUSPENDED">SUSPENDED</SelectItem><SelectItem value="RETIRED">RETIRED</SelectItem></SelectContent>
          </Select>
        </Field>
      </div>
      <ImageInput label="Staff picture" value={form.picture} onChange={(v) => setForm({ ...form, picture: v })} hint="Optional. Auto-resized." />
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        description="Staff records with qualifications, rank, salary, assigned courses and attendance."
        actions={<Button onClick={() => { setForm(emptyForm); setEditRow(null); setCreated(null); setAddOpen(true) }}><Plus className="size-4" /> Add Staff</Button>}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search name, staff no or specialty…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={deptF} onValueChange={setDeptF}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All departments</SelectItem>{data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading || !data ? (
            <LoadingBlock />
          ) : error ? (
            <div className="mt-4"><EmptyState title={error} /></div>
          ) : (
            <div className="mt-4 max-h-[560px] overflow-y-auto thin-scroll overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Staff</th>
                    <th className="py-2 pr-3 font-medium">Rank</th>
                    <th className="py-2 pr-3 font-medium">Department</th>
                    <th className="py-2 pr-3 font-medium">Salary</th>
                    <th className="py-2 pr-3 font-medium">Courses</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          {s.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.picture} alt="" className="size-8 rounded-full object-cover border" />
                          ) : (
                            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{s.fullName.charAt(0)}</span>
                          )}
                          <span>
                            <span className="block font-medium">{s.fullName}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{s.staffNo}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">{s.rank}</td>
                      <td className="py-2.5 pr-3">{s.department || '—'}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{naira(s.salary)}</td>
                      <td className="py-2.5 pr-3">
                        {s.courses.length > 0 ? (
                          <span className="flex flex-wrap gap-1">{s.courses.map((c) => <Badge key={c.code} variant="outline" className="text-[11px]">{c.code}</Badge>)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3"><StatusBadge status={s.status} /></td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-7" title="Attendance" onClick={() => setAttRow(s)}><CalendarCheck className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="size-7" title="Edit" onClick={() => openEdit(s)}><UserPen className="size-3.5" /></Button>
                          {role === 'PROVOST' && (
                            <ConfirmAction
                              trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600" title="Delete"><Trash2 className="size-3.5" /></Button>}
                              title="Delete staff?"
                              description={`Permanently delete ${s.fullName} (${s.staffNo})?`}
                              confirmLabel="Delete"
                              onConfirm={async () => {
                                const res = await deleteStaff(s.id)
                                if (res.ok) { toast.success('Staff deleted'); load() } else toast.error(res.error)
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.staff.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No staff match the filters.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Staff</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4 py-2 text-center">
              <p className="text-sm text-muted-foreground">Staff created with staff number:</p>
              <div className="rounded-lg border bg-emerald-50 px-4 py-3 font-mono font-bold text-emerald-900">{created}</div>
              <DialogFooter className="justify-center"><Button onClick={() => setAddOpen(false)}>Done</Button></DialogFooter>
            </div>
          ) : (
            <>
              {formFields}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button disabled={busy} onClick={saveForm}>{busy && <Loader2 className="size-4 animate-spin" />} Create Staff</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(v) => !v && setEditRow(null)}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Edit — {editRow?.fullName} ({editRow?.staffNo})</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button disabled={busy} onClick={saveForm}>{busy && <Loader2 className="size-4 animate-spin" />} Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance dialog */}
      <Dialog open={!!attRow} onOpenChange={(v) => !v && setAttRow(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Attendance — {attRow?.fullName}</DialogTitle></DialogHeader>
          {attRow && <AttendancePanel staffId={attRow.id} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AttendancePanel({ staffId }: { staffId: string }) {
  const [data, setData] = useState<any>(null)
  const [date, setDate] = useState(todayStr())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getAttendance(date)
    if (!res.error) setData(res)
  }, [date])

  useEffect(() => { load() }, [load])

  if (!data) return <LoadingBlock />
  const me = data.records.find((r: any) => r.staffId === staffId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        <div className="text-xs text-muted-foreground">Today: {data.counts.present} present · {data.counts.absent} absent · {data.counts.unmarked} unmarked</div>
      </div>
      <div>
        <p className="text-sm font-medium">Mark {me?.fullName || 'staff'} for {formatDate(date)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ATTENDANCE_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={me?.status === s ? 'default' : 'outline'}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await markAttendance(staffId, date, s)
                setBusy(false)
                if (res.ok) { toast.success(`Marked ${s.toLowerCase()}`); load() } else toast.error(res.error)
              }}
            >
              {busy && me?.status !== s && <Loader2 className="size-3 animate-spin" />} {s}
            </Button>
          ))}
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto thin-scroll rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Status</th></tr></thead>
          <tbody>
            {data.month.filter((r: any) => r.staffNo === me?.staffNo).map((r: any) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2">{formatDate(r.date)}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {data.month.filter((r: any) => r.staffNo === me?.staffNo).length === 0 && (
              <tr><td colSpan={2} className="px-3 py-4 text-center text-sm text-muted-foreground">No records this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
