'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTimetableEntry, deleteTimetableEntry, getTimetable } from '@/lib/actions/timetable'
import { DAY_LABELS, DAYS, SEMESTERS, LEVELS, levelLabel } from '@/lib/constants'
import { ConfirmAction, EmptyState, Field, LoadingBlock, PageHeader } from '@/components/shared/widgets'

export function TimetableModule() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [dept, setDept] = useState('')
  const [level, setLevel] = useState('100')
  const [semester, setSemester] = useState('1')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ day: 'MONDAY', startTime: '08:00', endTime: '10:00', courseId: '', lecturerId: '', room: '' })

  const load = useCallback(async () => {
    const res: any = await getTimetable({
      ...(dept ? { departmentId: dept } : {}),
      level: Number(level),
      semester: Number(semester),
    })
    if (res.error) setError(res.error)
    else {
      setData(res)
      if (!dept && res.departments[0]) setDept(res.departments[0].id)
    }
  }, [dept, level, semester])

  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable"
        description="Publish the class timetable per department, level and semester. Students see their own automatically."
        actions={<Button onClick={() => { setForm({ ...form, courseId: '' }); setOpen(true) }}><Plus className="size-4" /> Add Class</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <Field label="Department">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{data.departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Level">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Semester">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <p className="self-end text-xs text-muted-foreground">{data.session} session · {data.entries.length} class(es)</p>
      </div>

      {data.entries.length === 0 ? (
        <EmptyState title="No timetable entries yet" hint="Use “Add Class” to publish the timetable for this department/level." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(DAY_LABELS).map(([day, label]) => {
            const entries = data.entries.filter((e: any) => e.day === day)
            if (entries.length === 0) return null
            return (
              <Card key={day}>
                <CardContent className="pt-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <CalendarDays className="size-4" /> {label}
                  </h3>
                  <div className="mt-3 space-y-2">
                    {entries.map((e: any) => (
                      <div key={e.id} className="group rounded-lg border px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{e.courseCode}</p>
                          <Badge variant="outline" className="font-mono text-[11px]">{e.startTime}–{e.endTime}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.courseTitle}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-muted-foreground">{e.room || '—'} · {e.lecturer || 'Lecturer TBA'}</p>
                          <ConfirmAction
                            trigger={<Button variant="ghost" size="icon" className="size-6 text-red-600"><Trash2 className="size-3.5" /></Button>}
                            title="Remove class?"
                            description={`Remove ${e.courseCode} (${e.startTime}–${e.endTime}) on ${label}?`}
                            confirmLabel="Remove"
                            onConfirm={async () => {
                              const res = await deleteTimetableEntry(e.id)
                              if (res.ok) { toast.success('Class removed'); load() } else toast.error(res.error)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Timetable Class</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Course *">
              <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {data.courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                  {data.courses.length === 0 && <SelectItem value="_none" disabled>No courses for this dept/level/semester</SelectItem>}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Day">
                <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Room"><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 3 – MLT Block" /></Field>
              <Field label="Start Time"><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
              <Field label="End Time"><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
            </div>
            <Field label="Lecturer">
              <Select value={form.lecturerId} onValueChange={(v) => setForm({ ...form, lecturerId: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select staff (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Lecturer TBA</SelectItem>
                  {data.staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              For {data.departments.find((d: any) => d.id === dept)?.name} · {levelLabel(Number(level))} · Semester {semester}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await createTimetableEntry({
                  departmentId: dept, level: Number(level), session: data.session, semester: Number(semester),
                  day: form.day, startTime: form.startTime, endTime: form.endTime,
                  courseId: form.courseId, lecturerId: form.lecturerId || undefined, room: form.room || undefined,
                })
                setBusy(false)
                if (res.ok) { toast.success('Class added'); setOpen(false); load() } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Add Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
