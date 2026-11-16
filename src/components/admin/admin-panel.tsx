'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getAdminDashboard } from '@/lib/actions/settings'
import { formatDate, naira, num } from '@/lib/format'
import { canAccess, modulesForRole, levelLabel, type AdminRole, type ModuleKey } from '@/lib/constants'
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatCard } from '@/components/shared/widgets'
import type { SchoolInfo } from '@/components/app-shell'
import type { SessionPayload } from '@/lib/auth'
import { StudentsModule } from '@/components/admin/admin-students'
import { AdmissionsModule } from '@/components/admin/admin-admissions'
import { StaffModule } from '@/components/admin/admin-staff'
import { AcademicsModule } from '@/components/admin/admin-academics'
import { FeesModule } from '@/components/admin/admin-fees'
import { TimetableModule } from '@/components/admin/admin-timetable'
import { LibraryModule } from '@/components/admin/admin-library'
import { CommunicationModule } from '@/components/admin/admin-communication'
import { UsersModule } from '@/components/admin/admin-users-settings'
import { SettingsModule } from '@/components/admin/admin-users-settings'

const ICONS: Record<ModuleKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  students: Users,
  admissions: FileText,
  staff: UserCog,
  results: GraduationCap,
  fees: Wallet,
  timetable: CalendarDays,
  library: Library,
  communication: Megaphone,
  users: ShieldCheck,
  settings: BadgeCheck,
}

function Dashboard({ role }: { role: AdminRole }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    getAdminDashboard().then((res: any) => {
      if (res.error) setError(res.error)
      else setData(res)
    })
  }, [])
  if (error) return <ErrorBlock message={error} />
  if (!data) return <LoadingBlock />
  const d = data as any

  const maxLevel = Math.max(1, ...d.levelCounts.map((l: any) => l.count))
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${d.schoolName} · ${d.session} Session, Semester ${d.semester} — signed in as ${role}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active Students" value={d.stats.students} sub="Currently enrolled" icon={<Users />} />
        <StatCard label="Academic Staff" value={d.stats.staff} icon={<UserCog />} />
        <StatCard label="Pending Admissions" value={d.stats.pendingApplications} sub="Awaiting review" tone={d.stats.pendingApplications > 0 ? 'warn' : 'good'} icon={<FileText />} />
        <StatCard label="Fees Collected" value={naira(d.stats.collected)} sub={`${d.session} session`} tone="good" icon={<Wallet />} />
        <StatCard label="Expected Fees" value={naira(d.stats.payableTotal)} sub="From fee structures" icon={<ReceiptText />} />
        <StatCard label="Outstanding" value={naira(d.stats.outstanding)} tone={d.stats.outstanding > 0 ? 'bad' : 'good'} icon={<ReceiptText />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold">Students by Level</h2>
            <div className="mt-4 space-y-3">
              {d.levelCounts.map((l: any) => (
                <div key={l.level} className="flex items-center gap-3">
                  <span className="w-14 text-xs font-medium text-muted-foreground">{levelLabel(l.level)}</span>
                  <div className="h-3 flex-1 rounded-full bg-muted">
                    <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${(l.count / maxLevel) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium tabular-nums">{l.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold">Recent Payments</h2>
            <div className="mt-3 space-y-2">
              {d.recentPayments.length === 0 && <EmptyState title="No payments yet this session" />}
              {d.recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.studentName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.matricNo} · {formatDate(p.createdAt)}</p>
                  </div>
                  <span className="font-medium text-emerald-700">{naira(p.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold">Latest Announcements</h2>
          <div className="mt-3 space-y-2">
            {d.announcements.length === 0 && <EmptyState title="No announcements yet" />}
            {d.announcements.map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{a.title}</p>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{a.audience}</Badge> {formatDate(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminPanel({
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
  const role = (session.role || 'REGISTRAR') as AdminRole
  const nav = modulesForRole(role)

  const readHash = useCallback(() => {
    const h = window.location.hash.replace(/^#\/admin\/?/, '').replace(/^#/, '')
    return (h || 'dashboard') as ModuleKey
  }, [])
  const [view, setView] = useState<ModuleKey>(readHash)
  useEffect(() => {
    const handler = () => setView(readHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [readHash])

  const go = (key: ModuleKey) => {
    window.location.assign(`#/admin/${key}`)
    window.scrollTo({ top: 0 })
  }

  const activeModule = canAccess(role, view) ? view : 'dashboard'

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{school.shortName} — Admin Backend</p>
              <p className="truncate text-xs text-slate-400 leading-tight">{session.name} · {role.charAt(0) + role.slice(1).toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigate('/')}>
              Website
            </Button>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white" onClick={onLogout}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl w-full px-4 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nav.map((m) => {
              const Icon = ICONS[m.key]
              return (
                <button
                  key={m.key}
                  onClick={() => go(m.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeModule === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4" /> {m.label}
                </button>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          {activeModule === 'dashboard' && <Dashboard role={role} />}
          {activeModule === 'students' && <StudentsModule role={role} />}
          {activeModule === 'admissions' && <AdmissionsModule role={role} />}
          {activeModule === 'staff' && <StaffModule role={role} />}
          {activeModule === 'results' && <AcademicsModule />}
          {activeModule === 'fees' && <FeesModule />}
          {activeModule === 'timetable' && <TimetableModule />}
          {activeModule === 'library' && <LibraryModule />}
          {activeModule === 'communication' && <CommunicationModule role={role} />}
          {activeModule === 'users' && <UsersModule />}
          {activeModule === 'settings' && <SettingsModule />}
        </div>
      </div>

      <footer className="mt-auto border-t bg-white py-3 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {school.schoolName}
      </footer>
    </div>
  )
}
