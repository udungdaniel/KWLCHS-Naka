'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookPlus, GraduationCap, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createCourse,
  deleteCourse,
  deleteResults,
  getExistingResults,
  getCourses,
  getResultUploadContext,
  saveResults,
  updateCourse,
} from '@/lib/actions/academics'
import { num } from '@/lib/format'
import { SEMESTERS, LEVELS, levelLabel } from '@/lib/constants'
import { ConfirmAction, EmptyState, Field, LoadingBlock, PageHeader } from '@/components/shared/widgets'

type Dept = { id: string; name: string; code: string }

export function AcademicsModule() {
  return (
    <div className="space-y-5">
      <PageHeader title="Results & Courses" description="Upload examination results per course and manage the course catalogue with lecturer assignments." />
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload" className="gap-1.5"><GraduationCap className="size-4" /> Results Upload</TabsTrigger>
          <TabsTrigger value="courses" className="gap-1.5"><BookPlus className="size-4" /> Manage Courses</TabsTrigger>
        </TabsList>
        <TabsContent value="upload"><ResultsUpload /></TabsContent>
        <TabsContent value="courses"><CoursesManager /></TabsContent>
      </Tabs>
    </div>
  )
}

function ResultsUpload() {
  const [ctx, setCtx] = useState<any>(null)
  const [error, setError] = useState('')
  const [dept, setDept] = useState('')
  const [level, setLevel] = useState('100')
  const [semester, setSemester] = useState('1')
  const [courseId, setCourseId] = useState('')
  const [scores, setScores] = useState<Record<string, { ca: string; exam: string }>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    getResultUploadContext().then((res: any) => {
      if (res.error) setError(res.error)
      else {
        setCtx(res)
        if (res.departments[0]) setDept(res.departments[0].id)
        setSemester(String(res.semester || 1))
      }
    })
  }, [])

  const loadExisting = useCallback(async (cid: string) => {
    if (!cid || !ctx) return
    setLoading(true)
    const res: any = await getExistingResults(cid, ctx.session, Number(semester))
    setLoading(false)
    if (res.error) { toast.error(res.error); return }
    const map: Record<string, { ca: string; exam: string }> = {}
    for (const r of res.results || []) {
      map[r.studentId] = { ca: String(r.caScore), exam: String(r.examScore) }
    }
    setScores(map)
    setDirty(false)
  }, [ctx, semester])

  // reload existing results when course/semester changes
  useEffect(() => {
    if (courseId) loadExisting(courseId)
    else setScores({})
  }, [courseId, semester, loadExisting])

  const students = ctx?.students || []
  const courses = ctx?.courses || []

  const entryCount = useMemo(() => Object.values(scores).filter((s) => s.ca !== '' || s.exam !== '').length, [scores])

  const save = async () => {
    if (!courseId) return
    const entries = Object.entries(scores)
      .filter(([, v]) => v.ca !== '' || v.exam !== '')
      .map(([studentId, v]) => ({ studentId, caScore: Number(v.ca) || 0, examScore: Number(v.exam) || 0 }))
    if (entries.length === 0) {
      toast.error('Enter at least one student’s scores.')
      return
    }
    setBusy(true)
    const res = await saveResults(courseId, ctx.session, Number(semester), entries)
    setBusy(false)
    if (res.ok) {
      toast.success(`Saved ${res.data!.saved} result entry(ies). Grades computed automatically.`)
      setDirty(false)
      loadExisting(courseId)
    } else {
      toast.error(res.error)
    }
  }

  if (error) return <EmptyState title={error} />
  if (!ctx) return <LoadingBlock />

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm mb-4">
          <span className="text-muted-foreground">Upload period:</span>{' '}
          <span className="font-medium">{ctx.session} session · Semester {semester}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Field label="Department">
            <Select value={dept} onValueChange={(v) => { setDept(v); setCourseId('') }}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{ctx.departments.map((d: Dept) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Level">
            <Select value={level} onValueChange={(v) => { setLevel(v); setCourseId('') }}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={semester} onValueChange={(v) => { setSemester(v); setCourseId('') }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Course">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title} ({c.creditUnits} CU)</SelectItem>)}
                {courses.length === 0 && <SelectItem value="_none" disabled>No courses for this dept/level/semester</SelectItem>}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {!courseId ? (
          <div className="mt-6"><EmptyState title="Select a course to upload results" hint="Students are filtered automatically by department and level." /></div>
        ) : students.length === 0 ? (
          <div className="mt-6"><EmptyState title="No active students in this department/level" /></div>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm font-medium">{students.length} student(s) — enter CA (max 40) and Exam (max 60)</p>
              <div className="flex gap-2">
                {dirty && <span className="text-xs text-amber-600 self-center">Unsaved changes</span>}
                <Button disabled={busy} onClick={save}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Results ({entryCount})
                </Button>
                <ConfirmAction
                  trigger={<Button variant="outline" size="sm"><Trash2 className="size-4" /> Clear course results</Button>}
                  title="Clear all results for this course?"
                  description="Deletes every uploaded result for this course in the selected session/semester."
                  confirmLabel="Clear results"
                  onConfirm={async () => {
                    const res = await deleteResults(courseId, ctx.session, Number(semester))
                    if (res.ok) { toast.success(`Deleted ${res.data!.deleted} result entries`); loadExisting(courseId) } else toast.error(res.error)
                  }}
                />
              </div>
            </div>
            <div className="mt-3 max-h-[460px] overflow-y-auto thin-scroll">
              {loading && <LoadingBlock label="Loading existing scores…" />}
              {!loading && (
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Student</th>
                      <th className="py-2 pr-3 font-medium w-32">CA /40</th>
                      <th className="py-2 pr-3 font-medium w-32">Exam /60</th>
                      <th className="py-2 font-medium">Total / Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s: any) => {
                      const sc = scores[s.id] || { ca: '', exam: '' }
                      const total = (Number(sc.ca) || 0) + (Number(sc.exam) || 0)
                      const grade = total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 45 ? 'D' : total >= 40 ? 'E' : 'F'
                      return (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-3">
                            <span className="font-medium">{s.fullName}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{s.matricNo}</span>
                          </td>
                          <td className="py-2.5 pr-3">
                            <Input
                              type="number" min={0} max={40} className="w-24" value={sc.ca}
                              onChange={(e) => { setScores({ ...scores, [s.id]: { ...sc, ca: e.target.value } }); setDirty(true) }}
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <Input
                              type="number" min={0} max={60} className="w-24" value={sc.exam}
                              onChange={(e) => { setScores({ ...scores, [s.id]: { ...sc, exam: e.target.value } }); setDirty(true) }}
                            />
                          </td>
                          <td className="py-2.5">
                            {sc.ca !== '' || sc.exam !== '' ? (
                              <span className="flex items-center gap-2">
                                <span className="font-medium">{num(total)}</span>
                                <Badge className={grade === 'F' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>{grade}</Badge>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CoursesManager() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<any>(null)
  const [form, setForm] = useState({ code: '', title: '', creditUnits: '2', semester: '1', level: '100', departmentId: '', lecturerId: '' })
  const [busy, setBusy] = useState(false)
  const [deptF, setDeptF] = useState('ALL')

  const load = useCallback(async () => {
    const res: any = await getCourses()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setBusy(true)
    const payload = {
      code: form.code, title: form.title, creditUnits: Number(form.creditUnits) || 2,
      semester: Number(form.semester), level: Number(form.level),
      departmentId: form.departmentId || undefined,
      ...(editRow && form.lecturerId !== undefined ? { lecturerId: form.lecturerId || null } : {}),
    }
    const res: any = editRow ? await updateCourse(editRow.id, payload) : await createCourse(payload)
    setBusy(false)
    if (res.ok) {
      toast.success(editRow ? 'Course updated' : 'Course created')
      setAddOpen(false); setEditRow(null); load()
    } else {
      toast.error(res.error)
    }
  }

  const openEdit = (c: any) => {
    setForm({
      code: c.code, title: c.title, creditUnits: String(c.creditUnits), semester: String(c.semester),
      level: String(c.level), departmentId: c.departmentId || '', lecturerId: c.lecturerId || '',
    })
    setEditRow(c)
  }

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  const rows = data.courses.filter((c: any) => deptF === 'ALL' || c.departmentId === deptF || (deptF === 'GEN' && !c.departmentId))

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={deptF} onValueChange={setDeptF}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              <SelectItem value="GEN">General Studies (GES)</SelectItem>
              {data.departments.map((d: Dept) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="ml-auto" onClick={() => { setForm({ code: '', title: '', creditUnits: '2', semester: '1', level: '100', departmentId: '', lecturerId: '' }); setEditRow(null); setAddOpen(true) }}>
            <BookPlus className="size-4" /> Add Course
          </Button>
        </div>

        <div className="mt-4 max-h-[520px] overflow-y-auto thin-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Dept</th>
                <th className="py-2 pr-3 font-medium">Level</th>
                <th className="py-2 pr-3 font-medium">Sem</th>
                <th className="py-2 pr-3 font-medium">CU</th>
                <th className="py-2 pr-3 font-medium">Lecturer</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pr-3 font-medium">{c.code}</td>
                  <td className="py-2.5 pr-3">{c.title}</td>
                  <td className="py-2.5 pr-3">{c.department === 'General Studies' ? <Badge variant="outline">GES</Badge> : c.department}</td>
                  <td className="py-2.5 pr-3">{levelLabel(c.level)}</td>
                  <td className="py-2.5 pr-3">{c.semester}</td>
                  <td className="py-2.5 pr-3">{c.creditUnits}</td>
                  <td className="py-2.5 pr-3">{c.lecturer || <span className="text-xs text-muted-foreground">Unassigned</span>}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(c)}>Assign / Edit</Button>
                      <ConfirmAction
                        trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600"><Trash2 className="size-3.5" /></Button>}
                        title="Delete course?"
                        description={`Delete ${c.code} — ${c.title}? Courses with uploaded results cannot be deleted.`}
                        confirmLabel="Delete"
                        onConfirm={async () => {
                          const res = await deleteCourse(c.id)
                          if (res.ok) { toast.success('Course deleted'); load() } else toast.error(res.error)
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No courses found.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={addOpen || !!editRow} onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditRow(null) } }}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editRow ? `Edit ${editRow.code}` : 'Add Course'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Course Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MLT 101" /></Field>
            <Field label="Credit Units *"><Input type="number" min={1} max={6} value={form.creditUnits} onChange={(e) => setForm({ ...form, creditUnits: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Course Title *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
            <Field label="Level">
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v === '_gen' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_gen">General Studies (GES)</SelectItem>
                  {data.departments.map((d: Dept) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lecturer (course assignment)">
              <Select value={form.lecturerId} onValueChange={(v) => setForm({ ...form, lecturerId: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {data.staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.staffNo.split('/').pop()})</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditRow(null) }}>Cancel</Button>
            <Button disabled={busy} onClick={save}>{busy && <Loader2 className="size-4 animate-spin" />} {editRow ? 'Save' : 'Create Course'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
