'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Loader2, Plus, Receipt, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createFeeItem,
  deleteFeeItem,
  getFeeBalances,
  getFeeStructures,
  getPayments,
  recordPayment,
  deletePayment,
} from '@/lib/actions/fees'
import { sendFeeReminders } from '@/lib/actions/communication'
import { formatDate, naira, num } from '@/lib/format'
import { LEVELS, PAYMENT_METHODS, levelLabel } from '@/lib/constants'
import { ConfirmAction, EmptyState, Field, LoadingBlock, PageHeader, StatCard } from '@/components/shared/widgets'

type Dept = { id: string; name: string; code: string }

export function FeesModule() {
  return (
    <div className="space-y-5">
      <PageHeader title="Fees & Payments" description="Fee structures per department/level, payment recording and outstanding balances with WhatsApp/Email reminders." />
      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances" className="gap-1.5"><Wallet className="size-4" /> Balances</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5"><Receipt className="size-4" /> Payments</TabsTrigger>
          <TabsTrigger value="structures" className="gap-1.5"><Plus className="size-4" /> Fee Structures</TabsTrigger>
        </TabsList>
        <TabsContent value="balances"><Balances /></TabsContent>
        <TabsContent value="payments"><Payments /></TabsContent>
        <TabsContent value="structures"><Structures /></TabsContent>
      </Tabs>
    </div>
  )
}

function Balances() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [onlyOwing, setOnlyOwing] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getFeeBalances()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  const rows = onlyOwing ? data.rows.filter((r: any) => r.balance > 0) : data.rows

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expected" value={naira(data.totals.payable)} sub={`${data.session} session`} icon={<Receipt />} />
        <StatCard label="Collected" value={naira(data.totals.paid)} tone="good" icon={<Wallet />} />
        <StatCard label="Outstanding" value={naira(data.totals.outstanding)} tone="bad" icon={<Receipt />} />
        <StatCard label="Fully Paid / Owing" value={`${data.totals.fullyPaid} / ${data.totals.owing}`} icon={<Wallet />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const res = await sendFeeReminders(data.session)
            setBusy(false)
            if (res.ok) {
              toast.success(`Fee reminders queued for ${res.data!.queued} channel(s). WhatsApp/Email links ready in the Communication module.`, { duration: 8000 })
            } else toast.error(res.error)
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Send Fee Reminders (owing students)
        </Button>
        <Button variant={onlyOwing ? 'default' : 'outline'} onClick={() => setOnlyOwing(!onlyOwing)}>
          {onlyOwing ? 'Showing owing only' : 'Show owing only'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="max-h-[480px] overflow-y-auto thin-scroll overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Dept / Level</th>
                  <th className="py-2 pr-3 text-right font-medium">Payable</th>
                  <th className="py-2 pr-3 text-right font-medium">Paid</th>
                  <th className="py-2 pr-3 text-right font-medium">Balance</th>
                  <th className="py-2 font-medium">Contacts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.studentId} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{r.fullName}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{r.matricNo}</span>
                    </td>
                    <td className="py-2.5 pr-3">{r.department} · {levelLabel(r.level)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{naira(r.payable)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-700">{naira(r.paid)}</td>
                    <td className={`py-2.5 pr-3 text-right font-medium tabular-nums ${r.balance > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {naira(r.balance)} {r.balance > 0 && <Badge className="ml-1 bg-amber-100 text-amber-800 hover:bg-amber-100">Owing</Badge>}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{r.phone || '—'}{r.email ? ` · ${r.email}` : ''}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nothing to show.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Payments() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ matricNo: '', amount: '', method: 'TRANSFER', reference: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<{ receiptNo: string; student: string } | null>(null)

  const load = useCallback(async () => {
    const res: any = await getPayments()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {data ? `${data.payments.length} payment(s) · ${naira(data.totals.collected)} collected in ${data.session}` : 'Loading…'}
        </div>
        <Button onClick={() => { setForm({ matricNo: '', amount: '', method: 'TRANSFER', reference: '', note: '' }); setReceipt(null); setOpen(true) }}>
          <Plus className="size-4" /> Record Payment
        </Button>
      </div>
      {error && <EmptyState title={error} />}
      {!error && !data && <LoadingBlock />}
      {data && (
        <Card>
          <CardContent className="pt-5">
            <div className="max-h-[520px] overflow-y-auto thin-scroll overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Student</th>
                    <th className="py-2 pr-3 font-medium">Dept / Level</th>
                    <th className="py-2 pr-3 font-medium">Method</th>
                    <th className="py-2 pr-3 font-medium">Reference</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3">{formatDate(p.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{p.studentName}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{p.matricNo}</span>
                      </td>
                      <td className="py-2.5 pr-3">{p.department} · {levelLabel(p.level)}</td>
                      <td className="py-2.5 pr-3"><Badge variant="outline">{p.method}</Badge></td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{p.reference || '—'}</td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{naira(p.amount)}</td>
                      <td className="py-2.5">
                        <ConfirmAction
                          trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600"><Trash2 className="size-3.5" /></Button>}
                          title="Reverse payment?"
                          description={`Delete the ${naira(p.amount)} payment by ${p.studentName}? This changes the student's balance.`}
                          confirmLabel="Delete payment"
                          onConfirm={async () => {
                            const res = await deletePayment(p.id)
                            if (res.ok) { toast.success('Payment reversed'); load() } else toast.error(res.error)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {data.payments.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No payments recorded this session.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {receipt ? (
            <div className="space-y-4 py-2 text-center">
              <Receipt className="mx-auto size-10 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Payment recorded for {receipt.student}</p>
              <div className="rounded-lg border bg-emerald-50 px-4 py-3">
                <p className="text-xs text-emerald-800">Receipt number</p>
                <p className="font-mono font-bold text-emerald-900">{receipt.receiptNo}</p>
              </div>
              <DialogFooter className="justify-center">
                <Button onClick={() => { setOpen(false); load() }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                <Field label="Matric Number *"><Input value={form.matricNo} onChange={(e) => setForm({ ...form, matricNo: e.target.value })} placeholder="e.g. KWLCHS/2024/MLT/001" className="font-mono" /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Amount (₦) *"><Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                  <Field label="Method">
                    <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Reference / Teller No."><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Bank transfer reference (optional)" /></Field>
                <Field label="Note"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Full session payment" /></Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    const res = await recordPayment({ ...form, amount: Number(form.amount), session: data?.session || '' })
                    setBusy(false)
                    if (res.ok) setReceipt(res.data!)
                    else toast.error(res.error)
                  }}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Save Payment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Structures() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ departmentId: '', level: '100', itemName: '', amount: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res: any = await getFeeStructures()
    if (res.error) setError(res.error)
    else setData(res)
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <EmptyState title={error} />
  if (!data) return <LoadingBlock />

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Session: <span className="font-medium text-foreground">{data.session}</span></p>
          <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add Fee Item</Button>
        </div>
        <div className="mt-4 max-h-[520px] overflow-y-auto thin-scroll overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Department</th>
                <th className="py-2 pr-3 font-medium">Level</th>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((f: any) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pr-3">{f.department}</td>
                  <td className="py-2.5 pr-3">{levelLabel(f.level)}</td>
                  <td className="py-2.5 pr-3 font-medium">{f.itemName}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{naira(f.amount)}</td>
                  <td className="py-2.5">
                    <ConfirmAction
                      trigger={<Button variant="ghost" size="icon" className="size-7 text-red-600"><Trash2 className="size-3.5" /></Button>}
                      title="Delete fee item?"
                      description={`Delete ${f.itemName} for ${f.department} ${levelLabel(f.level)}?`}
                      confirmLabel="Delete"
                      onConfirm={async () => {
                        const res = await deleteFeeItem(f.id)
                        if (res.ok) { toast.success('Fee item deleted'); load() } else toast.error(res.error)
                      }}
                    />
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No fee items for this session yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Fee Item</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Department *">
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{data.departments.map((d: Dept) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Level">
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Amount (₦) *"><Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            </div>
            <Field label="Item Name *"><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="e.g. Tuition Fee" /></Field>
            <p className="text-xs text-muted-foreground">Applies to the {data.session} session for that department and level.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const res = await createFeeItem({ session: data.session, departmentId: form.departmentId, level: Number(form.level), itemName: form.itemName, amount: Number(form.amount) })
                setBusy(false)
                if (res.ok) { toast.success('Fee item added'); setOpen(false); load() } else toast.error(res.error)
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
