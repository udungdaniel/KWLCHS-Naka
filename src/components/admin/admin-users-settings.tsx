'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Loader2, Plus, Save, ShieldCheck, Trash2, UserPen } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { createUser, deleteUser, getUsers, resetUserPassword, updateUser } from '@/lib/actions/users'
import { createDepartment, deleteDepartment, getSettings, updateDepartment, updateSettings } from '@/lib/actions/settings'
import { formatDate, naira } from '@/lib/format'
import { LEVELS, ROLE_LABELS, type AdminRole } from '@/lib/constants'
import { ConfirmAction, EmptyState, Field, LoadingBlock, PageHeader, StatCard } from '@/components/shared/widgets'

// ==================== USERS (Provost only) ====================

const emptyUser = { fullName: '', email: '', role: 'REGISTRAR' as AdminRole, phone: '', password: '' }

export function UsersModule() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyUser)
  const [busy, setBusy] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [newPass, setNewPass] = useState('')

  const load = useCallback(async () => {
    const res: any = await getUsers()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Users"
        description="Only the Provost, Registrar and Bursar have admin access. Provost manages all three roles here."
        actions={<Button onClick={() => { setForm(emptyUser); setOpen(true) }}><Plus className="size-4" /> Add User</Button>}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{u.fullName}</span>
                      <span className="block text-xs text-muted-foreground">{u.email}{u.isYou && ' (you)'}</span>
                    </td>
                    <td className="py-2.5 pr-3"><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{ROLE_LABELS[u.role as AdminRole]}</Badge></td>
                    <td className="py-2.5 pr-3">{u.phone || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <Badge className={u.active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                        {u.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-7" title="Reset password" onClick={() => { setResetTarget(u); setNewPass('') }}>
                          <KeyRound className="size-3.5" />
                        </Button>
                        <UserEditDialog user={u} onSaved={load} />
                        <ConfirmAction
                          trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600" title="Delete"><Trash2 className="size-3.5" /></Button>}
                          title="Delete user?"
                          description={`Permanently delete ${u.fullName}'s account?`}
                          confirmLabel="Delete"
                          onConfirm={async () => {
                            const res = await deleteUser(u.id)
                            if (res.ok) { toast.success('User deleted'); load() } else toast.error(res.error)
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add System User</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Full Name *"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Official Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@kwchs-naka.edu.ng" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role *">
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROVOST">Provost</SelectItem>
                    <SelectItem value="REGISTRAR">Registrar</SelectItem>
                    <SelectItem value="BURSAR">Bursar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            </div>
            <Field label="Password *"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await createUser(form)
                setBusy(false)
                if (res.ok) { toast.success('User created'); setOpen(false); load() } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Reset password — {resetTarget?.fullName}</DialogTitle></DialogHeader>
          <Field label="New Password"><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="At least 6 characters" /></Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!resetTarget) return
                setBusy(true)
                const res = await resetUserPassword(resetTarget.id, newPass)
                setBusy(false)
                if (res.ok) { toast.success('Password reset'); setResetTarget(null) } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserEditDialog({ user, onSaved }: { user: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email, role: user.role as AdminRole, phone: user.phone || '', active: user.active })
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" className="size-7" title="Edit" onClick={() => setOpen(true)}><UserPen className="size-3.5" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Edit — {user.fullName}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Full Name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role">
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROVOST">Provost</SelectItem>
                    <SelectItem value="REGISTRAR">Registrar</SelectItem>
                    <SelectItem value="BURSAR">Bursar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label>Account active</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await updateUser(user.id, form)
                setBusy(false)
                if (res.ok) { toast.success('User updated'); setOpen(false); onSaved() } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ==================== SETTINGS (Provost only) ====================

export function SettingsModule() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' })
  const [deptBusy, setDeptBusy] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getSettings()
    if (res.error) setError(res.error)
    else {
      setData(res)
      setForm({
        schoolName: res.settings?.schoolName || '',
        shortName: res.settings?.shortName || '',
        address: res.settings?.address || '',
        phone: res.settings?.phone || '',
        email: res.settings?.email || '',
        motto: res.settings?.motto || '',
        about: res.settings?.about || '',
        currentSession: res.settings?.currentSession || '',
        currentSemester: String(res.settings?.currentSemester || 1),
        admissionOpen: res.settings?.admissionOpen ?? true,
        whatsappLine: res.settings?.whatsappLine || '',
      })
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data || !form) return <LoadingBlock />

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="College information, current session/semester and departments." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Departments" value={data.departments.length} />
        <StatCard label="Students enrolled" value={data.departments.reduce((s: number, d: any) => s + d.students, 0)} />
        <StatCard label="Staff" value={data.departments.reduce((s: number, d: any) => s + d.staff, 0)} />
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <h2 className="text-sm font-semibold">College Information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full School Name"><Input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} /></Field>
            <Field label="Short Name"><Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} /></Field>
            <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="WhatsApp Line (for notifications)"><Input value={form.whatsappLine} onChange={(e) => setForm({ ...form, whatsappLine: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Motto"><Input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="About the College (shown on the website)"><textarea className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm" rows={4} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /></Field></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Current Session"><Input value={form.currentSession} onChange={(e) => setForm({ ...form, currentSession: e.target.value })} placeholder="e.g. 2025/2026" /></Field>
            <Field label="Current Semester">
              <Select value={form.currentSemester} onValueChange={(v) => setForm({ ...form, currentSemester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">First Semester</SelectItem><SelectItem value="2">Second Semester</SelectItem></SelectContent>
              </Select>
            </Field>
            <div>
              <Label className="mb-1.5 block">Admission applications</Label>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
                <Switch checked={form.admissionOpen} onCheckedChange={(v) => setForm({ ...form, admissionOpen: v })} id="adm" />
                <Label htmlFor="adm" className="text-sm font-normal">{form.admissionOpen ? 'Open — public form accepts submissions' : 'Closed'}</Label>
              </div>
            </div>
          </div>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const res = await updateSettings({ ...form, currentSemester: Number(form.currentSemester) })
              setBusy(false)
              if (res.ok) {
                toast.success('Settings saved. The website and portals now reflect the new information.')
              } else {
                toast.error(res.error)
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Departments / Programmes</h2>
            <Button size="sm" onClick={() => { setDeptForm({ name: '', code: '', description: '' }); setDeptOpen(true) }}><Plus className="size-4" /> Add Department</Button>
          </div>
          <div className="mt-4 overflow-x-auto thin-scroll">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Students</th>
                  <th className="py-2 pr-3 font-medium">Staff</th>
                  <th className="py-2 pr-3 font-medium">Courses</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d: any) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2.5 pr-3 font-medium">{d.name}</td>
                    <td className="py-2.5 pr-3"><Badge variant="outline">{d.code}</Badge></td>
                    <td className="py-2.5 pr-3">{d.students}</td>
                    <td className="py-2.5 pr-3">{d.staff}</td>
                    <td className="py-2.5 pr-3">{d.courses}</td>
                    <td className="py-2.5 pr-3">
                      <Badge className={d.active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-muted text-muted-foreground hover:bg-muted'}>{d.active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={async () => {
                            const res = await updateDepartment(d.id, { active: !d.active })
                            if (res.ok) { toast.success(d.active ? 'Department deactivated' : 'Department activated'); load() } else toast.error(res.error)
                          }}
                        >
                          {d.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <ConfirmAction
                          trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600"><Trash2 className="size-3.5" /></Button>}
                          title="Delete department?"
                          description={`Delete ${d.name}? Only possible when it has no students or staff.`}
                          confirmLabel="Delete"
                          onConfirm={async () => {
                            const res = await deleteDepartment(d.id)
                            if (res.ok) { toast.success('Department deleted'); load() } else toast.error(res.error)
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Department Name *"><Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Nutrition & Dietetics" /></Field>
            <Field label="Code *"><Input value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. NUT" /></Field>
            <Field label="Description"><Input value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptOpen(false)}>Cancel</Button>
            <Button
              disabled={deptBusy}
              onClick={async () => {
                setDeptBusy(true)
                const res = await createDepartment(deptForm)
                setDeptBusy(false)
                if (res.ok) { toast.success('Department added'); setDeptOpen(false); load() } else toast.error(res.error)
              }}
            >
              {deptBusy && <Loader2 className="size-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
