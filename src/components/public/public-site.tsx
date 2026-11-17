'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  GraduationCap,
  Landmark,
  Loader2,
  Mail,
  Megaphone,
  Phone,
  Send,
  Stethoscope,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { checkApplicationStatus, getPublicData, submitApplication } from '@/lib/actions/public'
import { formatDate } from '@/lib/format'
import { GENDERS, EXAM_TYPES, levelLabel } from '@/lib/constants'
import { Field, ImageInput } from '@/components/shared/widgets'
import type { SchoolInfo } from '@/components/app-shell'
import type { SessionPayload } from '@/lib/auth'

type Dept = { id: string; name: string; code: string; description: string | null }
type Announcement = { id: string; title: string; body: string; audience: string; createdAt: string | Date }

function Nav({ school, navigate, session }: { school: SchoolInfo; navigate: (v: string) => void; session: SessionPayload | null }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-left">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Stethoscope className="size-5" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold leading-tight">{school.shortName}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight">Naka, Benue State</span>
            </span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Home</Button>
            <Button variant="ghost" size="sm" onClick={() => { navigate('/'); setTimeout(() => document.getElementById('programmes')?.scrollIntoView(), 60) }}>Programmes</Button>
            <Button variant="ghost" size="sm" onClick={() => { navigate('/'); setTimeout(() => document.getElementById('announcements')?.scrollIntoView(), 60) }}>Announcements</Button>
            <Button variant="ghost" size="sm" onClick={() => { navigate('/'); setTimeout(() => document.getElementById('contact')?.scrollIntoView(), 60) }}>Contact</Button>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" size="sm" onClick={() => navigate(session?.type === 'STUDENT' ? '/portal/dashboard' : '/login')}>
              <GraduationCap className="size-4" /> {session?.type === 'STUDENT' ? 'My Portal' : 'Student Login'}
            </Button>
            <Button size="sm" onClick={() => navigate('/apply')}>Apply Online</Button>
          </div>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t py-3 space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => navigate('/')}>Home</Button>
            <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => navigate('/status')}>Check Application Status</Button>
            <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => navigate(session?.type === 'STUDENT' ? '/portal/dashboard' : '/login')}>
              {session?.type === 'STUDENT' ? 'My Portal' : 'Student Login'}
            </Button>
            <Button className="w-full justify-start" size="sm" onClick={() => navigate('/apply')}>Apply Online</Button>
          </div>
        )}
      </div>
    </header>
  )
}

function Footer({ school }: { school: SchoolInfo }) {
  return (
    <footer className="mt-auto border-t bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="font-semibold text-white">{school.shortName}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{school.schoolName}</p>
          <p className="mt-3 text-xs italic text-emerald-300">“{school.motto}”</p>
        </div>
        <div>
          <p className="font-semibold text-white">Contact</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            <li className="flex gap-2"><Landmark className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> {school.address}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> {school.phone}</li>
            <li className="flex gap-2"><Mail className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> {school.email}</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Quick Links</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            <li><button className="hover:text-emerald-300" onClick={() => window.location.assign('#/apply')}>Apply for Admission</button></li>
            <li><button className="hover:text-emerald-300" onClick={() => window.location.assign('#/status')}>Check Application Status</button></li>
            <li><button className="hover:text-emerald-300" onClick={() => window.location.assign('#/login')}>Student Portal Login</button></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {school.shortName}. All rights reserved. Naka, Benue State, Nigeria.
      </div>
    </footer>
  )
}

function Home({ school, navigate }: { school: SchoolInfo; navigate: (v: string) => void }) {
  const [data, setData] = useState<{
    departments: Dept[]
    announcements: Announcement[]
    stats: { students: number; staff: number; departments: number }
  } | null>(null)

  useEffect(() => {
    getPublicData().then((res) => setData(res as any))
  }, [])

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Admissions open — {school.currentSession} Session</Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              {school.schoolName}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
              Training competent, ethical and compassionate health professionals for Nigeria. ND &amp; HND programmes in
              Community Health, Medical Laboratory Technology, Environmental Health, Health Information Management,
              Pharmacy Technology and Dental Surgery Technology.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/apply')}>
                Apply for Admission <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/status')}>
                <FileSearch className="size-4" /> Check Application Status
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate('/login')}>
                <GraduationCap className="size-4" /> Student Portal
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 max-w-md gap-4">
              {[
                { label: 'Programmes', value: data?.stats.departments ?? '—' },
                { label: 'Active Students', value: data?.stats.students ?? '—' },
                { label: 'Academic Staff', value: data?.stats.staff ?? '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-white px-3 py-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-emerald-700">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Stethoscope className="size-6" />
                </span>
                <div>
                  <p className="font-semibold text-sm">{school.shortName}</p>
                  <p className="text-xs text-muted-foreground">Naka, Gwer West LGA, Benue State</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 text-sm">
                {['Online admission applications', 'Student portal for results & fees', 'WhatsApp & Email announcements', 'Timetable, library & fee tracking'].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" /> {t}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                “{school.motto}”
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h2 className="text-2xl font-bold tracking-tight">About the College</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Established to serve Benue State and beyond, the College is committed to practical, hands-on training in the health sciences.
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm leading-relaxed text-muted-foreground">{school.about}</p>
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section id="programmes" className="bg-muted/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold tracking-tight">Our Programmes</h2>
          <p className="mt-2 text-sm text-muted-foreground">National Diploma (ND) and Higher National Diploma (HND) programmes across six departments.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.departments || []).map((d) => (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <Building2 className="size-5" />
                    </span>
                    <Badge variant="outline">{d.code}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold text-sm">{d.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{d.description}</p>
                </CardContent>
              </Card>
            ))}
            {!data && <p className="text-sm text-muted-foreground">Loading programmes…</p>}
          </div>
        </div>
      </section>

      {/* Admission steps */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold tracking-tight">How to Apply</h2>
        <p className="mt-2 text-sm text-muted-foreground">Admission is strictly online — no paper forms.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ClipboardList, t: '1. Apply Online', d: 'Fill the online admission form and submit your O-Level results.' },
            { icon: FileSearch, t: '2. Screening', d: 'The Registrar reviews your application and updates your status online.' },
            { icon: BadgeCheck, t: '3. Get Admitted', d: 'Successful candidates receive a matriculation number and portal password.' },
            { icon: GraduationCap, t: '4. Start Classes', d: 'Log in to the student portal to see fees, timetable and results.' },
          ].map((s) => (
            <Card key={s.t}>
              <CardContent className="pt-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-3 font-semibold text-sm">{s.t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Button size="lg" onClick={() => navigate('/apply')}>
            Start Your Application <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Announcements */}
      <section id="announcements" className="bg-muted/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <div className="mt-8 space-y-4">
            {(data?.announcements || []).map((a) => (
              <Card key={a.id}>
                <CardContent className="flex gap-4 pt-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Megaphone className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm">{a.title}</h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="size-3" /> {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!data && <p className="text-sm text-muted-foreground">Loading announcements…</p>}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <Landmark className="size-5 text-emerald-700" />
              <h3 className="mt-2 font-semibold text-sm">Visit Us</h3>
              <p className="mt-1 text-xs text-muted-foreground">{school.address}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <Phone className="size-5 text-emerald-700" />
              <h3 className="mt-2 font-semibold text-sm">Call or WhatsApp</h3>
              <p className="mt-1 text-xs text-muted-foreground">{school.phone}</p>
              {school.whatsappLine && (
                <a
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline"
                  href={`https://wa.me/${school.whatsappLine.replace(/[^\d]/g, '').replace(/^0/, '234')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chat on WhatsApp <ArrowRight className="size-3" />
                </a>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <Mail className="size-5 text-emerald-700" />
              <h3 className="mt-2 font-semibold text-sm">Email</h3>
              <p className="mt-1 text-xs text-muted-foreground">{school.email}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}

// ---------- Online admission application ----------
const SUBJECT_OPTIONS = ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Agricultural Science', 'Economics', 'Geography', 'Government', 'Health Science', 'Food & Nutrition', 'Computer Studies', 'Civic Education', 'Data Processing']
const GRADE_OPTIONS = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']

function Apply({ school, navigate }: { school: SchoolInfo; navigate: (v: string) => void }) {
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [depts, setDepts] = useState<Dept[]>([])
  const [done, setDone] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: '', lastName: '', otherName: '', gender: '', dob: '', phone: '', email: '', address: '', stateOfOrigin: '',
    departmentId: '', examType: '', examYear: '', examNo: '', passport: '' as string | null,
  })
  const [subjects, setSubjects] = useState<Array<{ subject: string; grade: string }>>([{ subject: '', grade: '' }])

  useEffect(() => {
    getPublicData().then((res: any) => setDepts(res.departments || []))
  }, [])

  const set = (k: string, v: string | null) => setForm((f) => ({ ...f, [k]: v ?? '' }))

  const valid1 = form.firstName.trim() && form.lastName.trim() && form.gender && form.phone.trim()
  const valid2 = !!form.departmentId
  const valid3 = subjects.some((s) => s.subject && s.grade)

  if (done) {
    return (
      <main className="flex-1 bg-muted/30 py-16">
        <div className="mx-auto max-w-lg px-4">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
              <h1 className="mt-4 text-xl font-bold">Application Submitted</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your application has been received by the Admissions Office. Keep your application number safe.
              </p>
              <div className="mt-5 rounded-lg border bg-emerald-50 px-4 py-4">
                <p className="text-xs text-emerald-800">Application Number</p>
                <p className="mt-1 text-lg font-mono font-bold text-emerald-900">{done}</p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={() => navigate('/status')}>Check Application Status</Button>
                <Button variant="outline" onClick={() => navigate('/')}>Back to Website</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 bg-muted/30 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold tracking-tight">Online Admission Application</h1>
        <p className="mt-1 text-sm text-muted-foreground">{school.shortName} — {school.currentSession} Admission Exercise</p>

        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Step {step} of 4</span>
            <span>{['Personal Details', 'Programme Choice', 'O-Level Results', 'Review & Submit'][step - 1]}</span>
          </div>
          <Progress value={(step / 4) * 100} className="mt-2 h-2" />
        </div>

        <Card className="mt-4">
          <CardContent className="pt-6 space-y-5">
            {step === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name *"><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First name" /></Field>
                  <Field label="Last Name *"><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Surname" /></Field>
                  <Field label="Other Name"><Input value={form.otherName} onChange={(e) => set('otherName', e.target.value)} placeholder="Middle name (optional)" /></Field>
                  <Field label="Gender *">
                    <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
                  <Field label="Phone Number *"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. 0813 456 7890" /></Field>
                  <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com (optional)" /></Field>
                  <Field label="State of Origin"><Input value={form.stateOfOrigin} onChange={(e) => set('stateOfOrigin', e.target.value)} placeholder="e.g. Benue" /></Field>
                </div>
                <Field label="Contact Address"><Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="House / street, town, LGA, State" /></Field>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">Choose the programme you are applying for. All applicants enter at <strong>ND I (100 Level)</strong>.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {depts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => set('departmentId', d.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${form.departmentId === d.id ? 'border-primary bg-emerald-50 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{d.name}</span>
                        <Badge variant="outline">{d.code}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Examination Type">
                    <Select value={form.examType} onValueChange={(v) => set('examType', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Exam Year"><Input value={form.examYear} onChange={(e) => set('examYear', e.target.value)} placeholder="e.g. 2024" /></Field>
                  <Field label="Exam Number"><Input value={form.examNo} onChange={(e) => set('examNo', e.target.value)} placeholder="e.g. WA425/2024/098" /></Field>
                </div>
                <div>
                  <Label>O-Level Subject Results (at least one)</Label>
                  <div className="mt-2 space-y-2">
                    {subjects.map((s, i) => (
                      <div key={i} className="flex gap-2">
                        <Select
                          value={s.subject}
                          onValueChange={(v) => setSubjects((arr) => arr.map((x, j) => (j === i ? { ...x, subject: v } : x)))}
                        >
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Subject" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {SUBJECT_OPTIONS.map((sub) => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select
                          value={s.grade}
                          onValueChange={(v) => setSubjects((arr) => arr.map((x, j) => (j === i ? { ...x, grade: v } : x)))}
                        >
                          <SelectTrigger className="w-24"><SelectValue placeholder="Grade" /></SelectTrigger>
                          <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button
                          type="button" variant="ghost" size="icon" className="shrink-0 text-red-600"
                          onClick={() => setSubjects((arr) => (arr.length > 1 ? arr.filter((_, j) => j !== i) : arr))}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSubjects((arr) => [...arr, { subject: '', grade: '' }])}>
                    Add Subject
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <ImageInput label="Passport Photograph (optional)" value={form.passport} onChange={(v) => setForm((f) => ({ ...f, passport: v }))} hint="JPG or PNG. It will be resized automatically." />
                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1.5">
                  <p className="font-medium">Review your application</p>
                  <p><span className="text-muted-foreground">Name:</span> {[form.firstName, form.otherName, form.lastName].filter(Boolean).join(' ')}</p>
                  <p><span className="text-muted-foreground">Gender:</span> {form.gender || '—'} · <span className="text-muted-foreground">Phone:</span> {form.phone || '—'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {form.email || '—'}</p>
                  <p><span className="text-muted-foreground">Programme:</span> {depts.find((d) => d.id === form.departmentId)?.name || '—'}</p>
                  <p><span className="text-muted-foreground">O-Level:</span> {form.examType || '—'} {form.examYear} · {subjects.filter((s) => s.subject && s.grade).length} subject(s)</p>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>Back</Button>
              {step < 4 ? (
                <Button
                  disabled={(step === 1 && !valid1) || (step === 2 && !valid2) || (step === 3 && !valid3)}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    const res = await submitApplication({
                      ...form,
                      subjects: subjects.filter((s) => s.subject && s.grade),
                      passport: form.passport || undefined,
                    })
                    setBusy(false)
                    if (res.ok) {
                      setDone(res.data!.applicationNo)
                    } else {
                      toast.error(res.error)
                    }
                  }}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Submit Application
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ---------- Application status check ----------
function StatusPage() {
  const [no, setNo] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    applicationNo: string; name: string; department: string; status: string; reviewNote?: string | null; createdAt: string | Date
  } | null>(null)
  const [error, setError] = useState('')

  return (
    <main className="flex-1 bg-muted/30 py-14">
      <div className="mx-auto max-w-lg px-4">
        <h1 className="text-2xl font-bold tracking-tight">Check Application Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the application number you received when you applied.</p>
        <Card className="mt-6">
          <CardContent className="pt-6 space-y-4">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                setError('')
                setResult(null)
                const res = await checkApplicationStatus(no)
                setBusy(false)
                if (res.ok) setResult(res.data as any)
                else setError(res.error)
              }}
            >
              <Input value={no} onChange={(e) => setNo(e.target.value)} placeholder="e.g. KWLCHS/APP/2025/0001" className="font-mono" required />
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />} Check
              </Button>
            </form>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{result.applicationNo}</span>
                  <Badge className={result.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : result.status === 'REJECTED' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
                    {result.status}
                  </Badge>
                </div>
                <p><span className="text-muted-foreground">Name:</span> {result.name}</p>
                <p><span className="text-muted-foreground">Programme applied:</span> {result.department}</p>
                <p><span className="text-muted-foreground">Submitted:</span> {formatDate(result.createdAt)}</p>
                {result.reviewNote && <p className="text-xs text-muted-foreground">Note: {result.reviewNote}</p>}
                {result.status === 'ADMITTED' && (
                  <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Congratulations! Visit the Registrar&apos;s office to collect your matriculation number and portal password.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export function PublicSite({
  school,
  page,
  navigate,
  session,
}: {
  school: SchoolInfo
  page: 'home' | 'apply' | 'status'
  navigate: (v: string) => void
  session: SessionPayload | null
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav school={school} navigate={navigate} session={session} />
      {page === 'home' && <Home school={school} navigate={navigate} />}
      {page === 'apply' && <Apply school={school} navigate={navigate} />}
      {page === 'status' && <StatusPage />}
      <Footer school={school} />
    </div>
  )
}
