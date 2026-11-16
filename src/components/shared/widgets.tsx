'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    good: 'text-emerald-700',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  }
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>}
      </div>
      <p className={`mt-2 text-xl sm:text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    PRESENT: 'bg-emerald-100 text-emerald-800',
    ADMITTED: 'bg-emerald-100 text-emerald-800',
    RETURNED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800',
    LATE: 'bg-amber-100 text-amber-800',
    LEAVE: 'bg-amber-100 text-amber-800',
    GRADUATED: 'bg-sky-100 text-sky-800',
    SUSPENDED: 'bg-orange-100 text-orange-800',
    REJECTED: 'bg-red-100 text-red-700',
    ABSENT: 'bg-red-100 text-red-700',
    WITHDRAWN: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || 'bg-muted text-muted-foreground'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
}: {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                setOpen(false)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Resizes an image file into a small JPEG data URL for storage
export async function fileToDataUrl(file: File, maxSize = 320, quality = 0.72): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

export function ImageInput({
  value,
  onChange,
  label,
  hint,
}: {
  value?: string | null
  onChange: (dataUrl: string | null) => void
  label: string
  hint?: string
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-16 w-16 rounded-md border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="space-y-1">
          <Input
            type="file"
            accept="image/*"
            className="w-56"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              if (f.size > 8 * 1024 * 1024) return
              setBusy(true)
              try {
                onChange(await fileToDataUrl(f))
              } finally {
                setBusy(false)
              }
            }}
          />
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {value && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => onChange(null)}>
              Remove photo
            </Button>
          )}
        </div>
        {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
