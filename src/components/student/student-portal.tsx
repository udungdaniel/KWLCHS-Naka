'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  Megaphone,
  ReceiptText,
  Save,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getStudentDashboard,
  getStudentFees,
  getStudentLibrary,
  getStudentProfile,
  getStudentResults,
  getStudentTimetable,
  updateStudentProfile,
} from '@/lib/actions/portal'
import { changePassword } from '@/lib/actions/auth'
import { formatDate, naira, num } from '@/lib/format'
import { DAY_LABELS, levelLabel } from '@/lib/constants'
import { EmptyState, ErrorBlock, Field, ImageInput, LoadingBlock, PageHeader, StatCard } from '@/components/shared/widgets'
import type { SchoolInfo } from '@/components/app-shell'
import type { SessionPayload } from '@/lib/auth'

type ViewKey = 'dashboard' | 'results' | 'fees' | 'timetable' | 'library' | 'profile'

const NAV: Array<{ key: ViewKey; label: string; icon: React.ElementType }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'results', label: 'Results', icon: GraduationCap },
  { key: 'fees', label: 'School Fees', icon: Wallet },
  { key: 'timetable', label: 'Timetable', icon: CalendarDays },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'profile', label: 'Profile', icon: BookOpen },
]

function Shell({
  school,
  session,
  active,
  navigate,
  onLogout,
  children,
}: {
  school: SchoolInfo
  session: SessionPayload
  active: ViewKey
  navigate: (v: string) => void
  onLogout: () => void
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{school.shortName} — Student Portal</p>
              <p className="truncate text-xs text-muted-foreground leading-tight">{session.name} · {session.ref}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Website</Button>
            <Button variant="outline" size="sm" onClick={onLogout}><LogOut className="size-4" /> Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl w-full px-4 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => navigate(`/portal/${n.key}`)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active === n.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <n.icon className="size-4" /> {n.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <footer className="mt-auto border-t bg-white py-3 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {school.schoolName}
      </footer>
    </div>
  )
}

function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentDashboard>> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getStudentDashboard().then((res: any) => {
      if (res.error) setError(res.error)
      else setData(res)
    })
  }, [])

  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${d.student.firstName}`}
        description={`${d.student.department} · ${levelLabel(d.student.level)} · ${d.session} Session (Semester ${d.semester})`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fee Balance" value={naira(d.fees.balance)} sub={`Paid ${naira(d.fees.paid)} of ${naira(d.fees.payable)}`} tone={d.fees.balance > 0 ? 'warn' : 'good'} icon={<Wallet />} />
        <StatCard label="CGPA" value={num(d.cgpa)} sub="On a 5.00 scale" icon={<GraduationCap />} />
        <StatCard label="Courses with Results" value={d.resultsCount} sub="All semesters" icon={<ReceiptText />} />
        <StatCard label="Books on Loan" value={d.activeLoans} sub="From the College library" icon={<BookOpen />} />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Megaphone className="size-4 text-amber-600" /> Announcements</h2>
          <div className="mt-3 space-y-3">
            {d.announcements.length === 0 && <EmptyState title="No announcements yet" />}
            {d.announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Results() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentResults>> | null>(null)
  const [error, setError] = useState('')
  const [sessionF, setSessionF] = useState('ALL')
  const [semesterF, setSemesterF] = useState('ALL')

  useEffect(() => {
    getStudentResults().then((res: any) => {
      if (res.error) setError(res.error)
      else setData(res)
    })
  }, [])

  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any

  const filtered = d.results.filter(
    (r: any) =>
      (sessionF === 'ALL' || r.session === sessionF) &&
      (semesterF === 'ALL' || r.semester === Number(semesterF))
  )
  const units = filtered.reduce((s: number, r: any) => s + r.creditUnits, 0)
  const points = filtered.reduce((s: number, r: any) => s + r.gradePoint * r.creditUnits, 0)
  const gpa = units > 0 ? points / units : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Examination Results" description="CA (40 marks) + Examination (60 marks). Grade points: A=5, B=4, C=3, D=2, E=1, F=0." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CGPA (all semesters)" value={num(d.cgpa)} icon={<GraduationCap />} />
        <StatCard label="Displayed GPA" value={units > 0 ? num(gpa) : '—'} sub={units > 0 ? `${units} credit units` : 'No selection'} icon={<ReceiptText />} />
        <StatCard label="Courses Displayed" value={filtered.length} icon={<BookOpen />} />
        <StatCard label="Result Periods" value={d.periods.length} sub="Semesters with results" icon={<CalendarDays />} />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Session">
              <Select value={sessionF} onValueChange={setSessionF}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sessions</SelectItem>
                  {Array.from(new Set(d.periods.map((p: any) => p.session))).map((s: any) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={semesterF} onValueChange={setSemesterF}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All semesters</SelectItem>
                  <SelectItem value="1">First Semester</SelectItem>
                  <SelectItem value="2">Second Semester</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4 overflow-x-auto thin-scroll">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Course</th>
                  <th className="py-2 pr-3 font-medium">CU</th>
                  <th className="py-2 pr-3 font-medium">CA /40</th>
                  <th className="py-2 pr-3 font-medium">Exam /60</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 pr-3 font-medium">Grade</th>
                  <th className="py-2 font-medium">GP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{r.courseCode}</span>
                      <span className="block text-xs text-muted-foreground">{r.courseTitle} · {r.session} Sem {r.semester}</span>
                    </td>
                    <td className="py-2.5 pr-3">{r.creditUnits}</td>
                    <td className="py-2.5 pr-3">{r.caScore}</td>
                    <td className="py-2.5 pr-3">{r.examScore}</td>
                    <td className="py-2.5 pr-3 font-medium">{r.total}</td>
                    <td className="py-2.5 pr-3">
                      <Badge className={r.grade === 'F' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>{r.grade}</Badge>
                    </td>
                    <td className="py-2.5">{r.gradePoint}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">No results for this selection.</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="font-medium">
                    <td className="py-2.5 pr-3">Total / GPA</td>
                    <td className="py-2.5 pr-3">{units}</td>
                    <td colSpan={3} />
                    <td className="py-2.5 pr-3">{num(points)} pts</td>
                    <td className="py-2.5">{num(gpa)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Fees() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentFees>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    getStudentFees().then((res: any) => {
      if (res.error) setError(res.error)
      else setData(res)
    })
  }, [])
  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any

  return (
    <div className="space-y-6">
      <PageHeader title="School Fees" description={`Breakdown for ${d.session} session — ${d.department}, ${levelLabel(d.level)}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Payable" value={naira(d.payable)} sub={`${d.feeItems.length} fee item(s)`} icon={<ReceiptText />} />
        <StatCard label="Paid" value={naira(d.paid)} tone="good" icon={<Wallet />} />
        <StatCard label="Balance" value={naira(d.balance)} tone={d.balance > 0 ? 'warn' : 'good'} sub={d.balance > 0 ? 'Pay at the Bursary' : 'Fully paid — keep your receipt'} icon={<ReceiptText />} />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold">Fee Breakdown</h2>
          <div className="mt-3 overflow-x-auto thin-scroll">
            <table className="w-full min-w-[380px] text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 font-medium">Item</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
              <tbody>
                {d.feeItems.map((f: any) => (
                  <tr key={f.itemName} className="border-b last:border-0">
                    <td className="py-2.5">{f.itemName}</td>
                    <td className="py-2.5 text-right">{naira(f.amount)}</td>
                  </tr>
                ))}
                {d.feeItems.length === 0 && <tr><td colSpan={2} className="py-4 text-center text-sm text-muted-foreground">No fee structure published for your department/level yet.</td></tr>}
              </tbody>
              {d.feeItems.length > 0 && (
                <tfoot><tr className="font-semibold"><td className="py-2.5">Total</td><td className="py-2.5 text-right">{naira(d.payable)}</td></tr></tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold">Payment History</h2>
          <div className="mt-3 overflow-x-auto thin-scroll">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 font-medium">Date</th><th className="py-2 font-medium">Session</th><th className="py-2 font-medium">Method</th><th className="py-2 font-medium">Reference</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
              <tbody>
                {d.payments.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2.5">{formatDate(p.createdAt)}</td>
                    <td className="py-2.5">{p.session}</td>
                    <td className="py-2.5"><Badge variant="outline">{p.method}</Badge></td>
                    <td className="py-2.5 font-mono text-xs">{p.reference || '—'}</td>
                    <td className="py-2.5 text-right font-medium">{naira(p.amount)}</td>
                  </tr>
                ))}
                {d.payments.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">No payments recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Timetable() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentTimetable>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    getStudentTimetable().then((res: any) => {
      if (res.error) setError(res.error)
      else setData(res)
    })
  }, [])
  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any

  return (
    <div className="space-y-6">
      <PageHeader title="Class Timetable" description={`${d.session} Session — Semester ${d.semester}`} />
      {d.entries.length === 0 ? (
        <EmptyState title="No timetable published yet" hint="Your departmental timetable will appear here once the Registry uploads it." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(DAY_LABELS).map(([day, label]) => {
            const entries = d.entries.filter((e: any) => e.day === day)
            if (entries.length === 0) return null
            return (
              <Card key={day}>
                <CardContent className="pt-5">
                  <h3 className="text-sm font-semibold text-emerald-800">{label}</h3>
                  <div className="mt-3 space-y-2">
                    {entries.map((e: any) => (
                      <div key={e.id} className="rounded-lg border px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{e.courseCode}</p>
                          <Badge variant="outline" className="font-mono text-[11px]">{e.startTime}–{e.endTime}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.courseTitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">{e.room || '—'} · {e.lecturer || 'Lecturer TBA'}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LibraryView() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentLibrary>> | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    getStudentLibrary().then((res: any) => {
      if (res.error) setError(res.error)
      else setData(res)
    })
  }, [])
  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any
  const books = d.books.filter(
    (b: any) => !q || b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader title="College Library" description="Browse the catalogue. Borrowing is done at the library desk." />
      <Card>
        <CardContent className="pt-5">
          <Input placeholder="Search by title or author…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <div className="mt-4 max-h-[420px] overflow-y-auto thin-scroll">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Title</th><th className="py-2 font-medium">Author</th>
                  <th className="py-2 font-medium">Category</th><th className="py-2 font-medium">Shelf</th>
                  <th className="py-2 text-right font-medium">Available</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b: any) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{b.title}</td>
                    <td className="py-2.5 pr-3">{b.author}</td>
                    <td className="py-2.5 pr-3">{b.category || '—'}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{b.shelfLocation || '—'}</td>
                    <td className="py-2.5 text-right">
                      <span className={b.available > 0 ? 'text-emerald-700 font-medium' : 'text-red-600'}>{b.available} / {b.total}</span>
                    </td>
                  </tr>
                ))}
                {books.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">No books match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold">My Borrowed Books</h2>
          <div className="mt-3 space-y-2">
            {d.loans.length === 0 && <EmptyState title="You have no loan records" />}
            {d.loans.map((l: any) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.author} · Borrowed {formatDate(l.borrowedAt)} · Due {formatDate(l.dueDate)}</p>
                </div>
                <Badge className={l.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>
                  {l.status === 'ACTIVE' ? 'On loan' : 'Returned'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Profile() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentProfile>> | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', phone: '', address: '', photo: '' as string | null })
  const [pass, setPass] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getStudentProfile()
    if (res.error) setError(res.error)
    else {
      setData(res)
      setForm({ email: res.email || '', phone: res.phone || '', address: res.address || '', photo: res.photo || '' })
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Your bio-data is managed by the Registry. You may update your contact details below." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              {d.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.photo} alt="Passport" className="size-20 rounded-lg border object-cover" />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">No photo</div>
              )}
              <div>
                <p className="font-semibold">{d.firstName} {d.otherName || ''} {d.lastName}</p>
                <p className="font-mono text-xs text-muted-foreground">{d.matricNo}</p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline">{d.department}</Badge>
                  <Badge variant="outline">{levelLabel(d.level)}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{d.status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Gender:</span> {d.gender}</p>
              <p><span className="text-muted-foreground">Date of birth:</span> {d.dob ? formatDate(d.dob) : '—'}</p>
              <p><span className="text-muted-foreground">State of origin:</span> {d.stateOfOrigin || '—'}</p>
              <p><span className="text-muted-foreground">Address:</span> {d.address || '—'}</p>
            </div>
            <div className="space-y-3 border-t pt-4">
              <ImageInput label="Update passport photo" value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} hint="Will be shown to the Registry" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
              </div>
              <Field label="Contact address"><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  const res = await updateStudentProfile(form)
                  setBusy(false)
                  if (res.ok) { toast.success('Profile updated'); load() }
                  else toast.error(res.error)
                }}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold">Change Password</h2>
            <Field label="Current password">
              <Input type="password" value={pass.current} onChange={(e) => setPass((p) => ({ ...p, current: e.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="New password">
                <Input type="password" value={pass.next} onChange={(e) => setPass((p) => ({ ...p, next: e.target.value }))} />
              </Field>
              <Field label="Confirm new password">
                <Input type="password" value={pass.confirm} onChange={(e) => setPass((p) => ({ ...p, confirm: e.target.value }))} />
              </Field>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await changePassword(pass.current, pass.next, pass.confirm)
                setBusy(false)
                if (res.ok) {
                  toast.success('Password changed successfully')
                  setPass({ current: '', next: '', confirm: '' })
                } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Change Password
            </Button>
            <p className="text-xs text-muted-foreground">Tip: changing your password does not sign you out on this device.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function StudentPortal({
  school,
  session,
  navigate,
  onLogout,
}: {
  school: SchoolInfo
  session: SessionPayload
  navigate: (v: string) => void
  onLogout: () => void
}) {
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  const active = (hash.replace(/^#\/portal\//, '').replace(/^#/, '') || 'dashboard') as ViewKey
  const [view, setView] = useState<ViewKey>(active)

  useEffect(() => {
    const read = () => {
      const h = (window.location.hash.replace(/^#\/portal\//, '').replace(/^#/, '') || 'dashboard') as ViewKey
      setView(h)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  return (
    <Shell school={school} session={session} active={view} navigate={navigate} onLogout={onLogout}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'results' && <Results />}
      {view === 'fees' && <Fees />}
      {view === 'timetable' && <Timetable />}
      {view === 'library' && <LibraryView />}
      {view === 'profile' && <Profile />}
    </Shell>
  )
}
