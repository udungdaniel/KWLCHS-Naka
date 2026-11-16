'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, ExternalLink, Loader2, Mail, Megaphone, MessageCircle, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { deleteAnnouncement, getCommunicationData, markMessageOpened, sendAnnouncement, sendFeeReminders } from '@/lib/actions/communication'
import { formatDateTime } from '@/lib/format'
import { ConfirmAction, EmptyState, Field, LoadingBlock, PageHeader, StatCard } from '@/components/shared/widgets'
import type { AdminRole } from '@/lib/constants'

export function CommunicationModule({ role }: { role: AdminRole }) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Communication"
        description="Send announcements to students and staff via WhatsApp and Email. Fee reminders are generated with one click for owing students."
      />
      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose" className="gap-1.5"><Send className="size-4" /> Compose</TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5"><MessageCircle className="size-4" /> Message Log</TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1.5"><Megaphone className="size-4" /> Announcements</TabsTrigger>
        </TabsList>
        <TabsContent value="compose"><Compose role={role} /></TabsContent>
        <TabsContent value="log"><MessageLog /></TabsContent>
        <TabsContent value="announcements"><Announcements role={role} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Compose({ role }: { role: AdminRole }) {
  const [data, setData] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'STUDENTS' | 'STAFF' | 'BOTH'>('BOTH')
  const [whatsapp, setWhatsapp] = useState(true)
  const [email, setEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reminding, setReminding] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getCommunicationData()
    if (!res.error) setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students reachable" value={data?.recipients.students ?? '—'} sub="With phone numbers" icon={<MessageCircle />} />
        <StatCard label="Staff reachable" value={data?.recipients.staff ?? '—'} sub="With phone or email" icon={<Mail />} />
        <StatCard label="Messages queued (latest 100)" value={data?.messages.length ?? '—'} icon={<Send />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <h2 className="text-sm font-semibold">New Announcement</h2>
            <Field label="Title *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Examination Timetable Released" /></Field>
            <Field label="Message *"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type the announcement body…" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Send to *">
                <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENTS">Students only</SelectItem>
                    <SelectItem value="STAFF">Staff only</SelectItem>
                    <SelectItem value="BOTH">Students &amp; Staff</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div>
                <Label className="mb-1.5 block">Channels *</Label>
                <div className="flex gap-4 pt-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={whatsapp} onCheckedChange={(v) => setWhatsapp(!!v)} /> WhatsApp
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={email} onCheckedChange={(v) => setEmail(!!v)} /> Email
                  </label>
                </div>
              </div>
            </div>
            <Button
              disabled={busy || !title.trim() || !body.trim() || (!whatsapp && !email)}
              onClick={async () => {
                setBusy(true)
                const res = await sendAnnouncement({
                  title, body, audience,
                  channels: [...(whatsapp ? ['WHATSAPP' as const] : []), ...(email ? ['EMAIL' as const] : [])],
                })
                setBusy(false)
                if (res.ok) {
                  toast.success(`Announcement published — ${res.data!.queued} WhatsApp/Email message(s) queued in the Message Log.`, { duration: 8000 })
                  setTitle(''); setBody('')
                  load()
                } else toast.error(res.error)
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send Announcement
            </Button>
            <p className="text-xs text-muted-foreground">
              How it works: the system prepares a personalised WhatsApp (wa.me) and Email (mailto) message per recipient. Open the Message Log to send each one with a click, or use it alongside bulk SMS/WhatsApp tools.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <h2 className="text-sm font-semibold">Fee Payment Reminders</h2>
            <p className="text-sm text-muted-foreground">
              One click generates a personalised reminder (with the exact amount owed) for every student with an outstanding balance in the current session.
            </p>
            {(role === 'BURSAR' || role === 'PROVOST') ? (
              <Button
                disabled={reminding}
                onClick={async () => {
                  setReminding(true)
                  const res = await sendFeeReminders()
                  setReminding(false)
                  if (res.ok) {
                    toast.success(`${res.data!.queued} reminder message(s) queued for students owing a total of ₦${res.data!.totalOwed.toLocaleString()}.`, { duration: 8000 })
                    load()
                  } else toast.error(res.error)
                }}
              >
                {reminding ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Generate Fee Reminders Now
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Only the Bursar or Provost can generate fee reminders.</p>
            )}

            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Reminder message preview</p>
              <p>“Dear {'{student}'}, this is a reminder that your outstanding fees for the {'{session}'} academic session amount to {'₦{amount}'} … — Bursar, KWLCHS Naka”</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MessageLog() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [kindF, setKindF] = useState('ALL')

  const load = useCallback(async () => {
    const res: any = await getCommunicationData()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  const rows = data.messages.filter((m: any) => kindF === 'ALL' || m.kind === kindF)

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Latest {rows.length} queued message(s). Click “Open” to send via WhatsApp or Email app.</p>
          <Select value={kindF} onValueChange={setKindF}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="FEE_REMINDER">Fee reminders</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 max-h-[520px] overflow-y-auto thin-scroll">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Recipient</th>
                <th className="py-2 pr-3 font-medium">Destination</th>
                <th className="py-2 pr-3 font-medium">Subject</th>
                <th className="py-2 pr-3 font-medium">Queued</th>
                <th className="py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m: any) => (
                <tr key={m.id} className={`border-b last:border-0 ${m.opened ? 'opacity-60' : ''}`}>
                  <td className="py-2.5 pr-3">
                    <Badge className={
                      m.kind === 'FEE_REMINDER' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                        : m.kind === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-sky-100 text-sky-800 hover:bg-sky-100'
                    }>
                      {m.kind === 'FEE_REMINDER' ? 'Fee reminder' : m.kind === 'WHATSAPP' ? 'WhatsApp' : 'Email'}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    {m.recipientName}
                    <span className="block text-xs text-muted-foreground">{m.recipientType}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{m.destination}</td>
                  <td className="py-2.5 pr-3 max-w-52"><span className="line-clamp-1 text-xs">{m.subject}</span></td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</td>
                  <td className="py-2.5">
                    {m.link && (
                      <Button
                        size="sm" variant={m.opened ? 'ghost' : 'outline'} className="h-7 gap-1 text-xs"
                        onClick={() => {
                          window.open(m.link, '_blank')
                          markMessageOpened(m.id).then(load)
                        }}
                      >
                        <ExternalLink className="size-3" /> {m.opened ? 'Re-open' : 'Open'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No messages queued yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function Announcements({ role }: { role: AdminRole }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res: any = await getCommunicationData()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  return (
    <div className="space-y-3">
      {data.announcements.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-sm">{a.title}</h3>
                  <Badge variant="outline">{a.audience === 'BOTH' ? 'Students & Staff' : a.audience === 'STUDENTS' ? 'Students' : 'Staff'}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">{a.body}</p>
              </div>
              {role !== 'BURSAR' && (
                <ConfirmAction
                  trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600"><Trash2 className="size-3.5" /></Button>}
                  title="Delete announcement?"
                  description={`Delete "${a.title}"? It also disappears from the student dashboard.`}
                  confirmLabel="Delete"
                  onConfirm={async () => {
                    const res = await deleteAnnouncement(a.id)
                    if (res.ok) { toast.success('Announcement deleted'); load() } else toast.error(res.error)
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {data.announcements.length === 0 && <EmptyState title="No announcements yet" hint="Compose your first announcement in the Compose tab." />}
    </div>
  )
}
