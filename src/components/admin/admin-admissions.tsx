'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { admitApplication, deleteApplication, getApplications, rejectApplication } from '@/lib/actions/admissions'
import { formatDate } from '@/lib/format'
import { ConfirmAction, EmptyState, LoadingBlock, PageHeader, StatCard, StatusBadge } from '@/components/shared/widgets'
import type { AdminRole } from '@/lib/constants'

type Dept = { id: string; name: string; code: string }
type App = {
  id: string; applicationNo: string; fullName: string; gender: string; dob: string | null
  email: string | null; phone: string; address: string | null; stateOfOrigin: string | null
  department: string; departmentCode: string; departmentId: string
  examType: string | null; examYear: string | null; examNo: string | null
  subjects: Array<{ subject: string; grade: string }>; passport: string | null
  status: string; reviewNote: string | null; createdAt: string | Date
}

export function AdmissionsModule({ role }: { role: AdminRole }) {
  const [data, setData] = useState<{ applications: App[]; departments: Dept[]; counts: any } | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<App | null>(null)
  const [admitDept, setAdmitDept] = useState('')
  const [busy, setBusy] = useState(false)
  const [admitted, setAdmitted] = useState<{ matricNo: string; password: string } | null>(null)
  const [admitTarget, setAdmitTarget] = useState<App | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res: any = await getApplications()
    if (res.error) setError(res.error)
    else setData({ applications: res.applications, departments: res.departments, counts: res.counts })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data?.applications.filter((a) => a.status === tab) || []

  return (
    <div className="space-y-5">
      <PageHeader title="Admissions" description="Review online applications. Admitting generates a matriculation number and portal password." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending Review" value={data?.counts.pending ?? '—'} tone={(data?.counts.pending || 0) > 0 ? 'warn' : 'good'} icon={<FileText />} />
        <StatCard label="Admitted" value={data?.counts.admitted ?? '—'} tone="good" icon={<CheckCircle2 />} />
        <StatCard label="Rejected" value={data?.counts.rejected ?? '—'} icon={<XCircle />} />
      </div>

      <Card>
        <CardContent className="pt-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="ADMITTED">Admitted</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              {loading ? (
                <LoadingBlock />
              ) : error ? (
                <EmptyState title={error} />
              ) : rows.length === 0 ? (
                <EmptyState title={`No ${tab.toLowerCase()} applications`} />
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto thin-scroll pr-1">
                  {rows.map((a) => (
                    <div key={a.id} className="rounded-lg border px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {a.passport ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.passport} alt="" className="size-12 rounded-lg border object-cover" />
                          ) : (
                            <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{a.fullName.charAt(0)}</span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium">{a.fullName} <span className="ml-1"><StatusBadge status={a.status} /></span></p>
                            <p className="font-mono text-xs text-muted-foreground">{a.applicationNo}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.departmentCode} · {a.gender} · {a.phone} · Applied {formatDate(a.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetail(a)}>View Details</Button>
                          {(a.status === 'PENDING' || a.status === 'REJECTED') && (
                            <Button
                              size="sm"
                              onClick={() => { setAdmitDept(a.departmentId); setAdmitted(null); setDetail(null); setAdmitTarget(a) }}
                            >
                              Admit
                            </Button>
                          )}
                          {a.status === 'PENDING' && (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="ghost" className="text-red-600">Reject</Button>}
                              title="Reject application?"
                              description="The applicant will see the rejection status when they check online."
                              confirmLabel="Reject"
                              onConfirm={async () => {
                                const res = await rejectApplication(a.id)
                                if (res.ok) { toast.success('Application rejected'); load() } else toast.error(res.error)
                              }}
                            />
                          )}
                          {role === 'PROVOST' && (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="ghost" className="text-red-600">Delete</Button>}
                              title="Delete application?"
                              description={`Permanently delete ${a.applicationNo}?`}
                              confirmLabel="Delete"
                              onConfirm={async () => {
                                const res = await deleteApplication(a.id)
                                if (res.ok) { toast.success('Deleted'); load() } else toast.error(res.error)
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{detail?.fullName}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-4">
                {detail.passport && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.passport} alt="" className="size-20 rounded-lg border object-cover" />
                )}
                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">{detail.applicationNo}</p>
                  <p><span className="text-muted-foreground">Programme:</span> {detail.department}</p>
                  <p><span className="text-muted-foreground">Gender:</span> {detail.gender} · <span className="text-muted-foreground">DoB:</span> {detail.dob ? formatDate(detail.dob) : '—'}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {detail.phone} · <span className="text-muted-foreground">Email:</span> {detail.email || '—'}</p>
                  <p><span className="text-muted-foreground">State:</span> {detail.stateOfOrigin || '—'}</p>
                  <p><span className="text-muted-foreground">Address:</span> {detail.address || '—'}</p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">O-Level Results</p>
                <p className="text-sm mt-1">{detail.examType || '—'} {detail.examYear || ''} {detail.examNo ? `(${detail.examNo})` : ''}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.subjects.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{s.subject}: {s.grade}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admit dialog */}
      <Dialog open={!!admitTarget} onOpenChange={(v) => !v && setAdmitTarget(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Admit {admitTarget?.fullName}</DialogTitle></DialogHeader>
          {admitted ? (
            <div className="space-y-4 py-2 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Student admitted successfully. New matriculation number and password:</p>
              <div className="rounded-lg border bg-emerald-50 px-4 py-3">
                <p className="font-mono font-bold text-emerald-900">{admitted.matricNo}</p>
                <p className="mt-1 font-mono text-sm text-emerald-800">Password: {admitted.password}</p>
              </div>
              <p className="text-xs text-muted-foreground">Send these to the applicant — they will log in to the student portal.</p>
              <DialogFooter className="justify-center">
                <Button onClick={() => { setAdmitTarget(null); setAdmitted(null); load() }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>Admit into department</Label>
                <Select value={admitDept} onValueChange={setAdmitDept}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The student enters at ND I (100 Level) in the current session.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdmitTarget(null)}>Cancel</Button>
                <Button
                  disabled={busy || !admitDept}
                  onClick={async () => {
                    if (!admitTarget) return
                    setBusy(true)
                    const res = await admitApplication(admitTarget.id, admitDept)
                    setBusy(false)
                    if (res.ok) setAdmitted(res.data!)
                    else toast.error(res.error)
                  }}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Confirm Admission
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
