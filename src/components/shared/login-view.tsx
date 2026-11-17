'use client'

import { useState } from 'react'
import { GraduationCap, Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminLogin, studentLogin } from '@/lib/actions/auth'
import type { SchoolInfo } from '@/components/app-shell'

export function LoginView({
  defaultTab,
  school,
  notice,
  goPublic,
}: {
  defaultTab: 'student' | 'admin'
  school: SchoolInfo
  notice?: string
  goPublic: () => void
}) {
  const [matric, setMatric] = useState('')
  const [studentPass, setStudentPass] = useState('')
  const [email, setEmail] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/70 via-background to-background">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <button onClick={goPublic} className="flex items-center gap-2 text-left">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">CH</span>
            <span>
              <span className="block text-sm font-semibold leading-tight">{school.shortName}</span>
              <span className="block text-xs text-muted-foreground leading-tight">Naka, Benue State</span>
            </span>
          </button>
          <Button variant="ghost" size="sm" onClick={goPublic}>
            Back to website
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          {notice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Portal Sign In</CardTitle>
              <CardDescription>Students use matric number. Staff use official email.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="student" className="gap-1.5">
                    <GraduationCap className="size-4" /> Student
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="gap-1.5">
                    <ShieldCheck className="size-4" /> Staff / Admin
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="student">
                  <form
                    className="space-y-4 pt-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      setBusy(true)
                      const res = await studentLogin(matric, studentPass)
                      setBusy(false)
                      if (res.ok) {
                        toast.success('Welcome back!')
                        window.location.assign('/#/portal/dashboard')
                        window.location.reload()
                      } else {
                        toast.error(res.error)
                      }
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="matric">Matriculation Number</Label>
                      <Input
                        id="matric"
                        placeholder="e.g. KWLCHS/2025/MLT/001"
                        value={matric}
                        onChange={(e) => setMatric(e.target.value)}
                        autoCapitalize="characters"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="spass">Password</Label>
                      <Input id="spass" type="password" value={studentPass} onChange={(e) => setStudentPass(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in to Student Portal
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="admin">
                  <form
                    className="space-y-4 pt-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      setBusy(true)
                      const res = await adminLogin(email, adminPass)
                      setBusy(false)
                      if (res.ok) {
                        toast.success('Welcome!')
                        window.location.assign('/#/admin/dashboard')
                        window.location.reload()
                      } else {
                        toast.error(res.error)
                      }
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="aemail">Official Email</Label>
                      <Input
                        id="aemail"
                        type="email"
                        placeholder="you@kwchs-naka.edu.ng"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="apass">Password</Label>
                      <Input id="apass" type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in to Admin Backend
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Demo accounts login details for your review</p>
              <p>Provost — provost@kwchs-naka.edu.ng / Provost@2025</p>
              <p>Registrar — registrar@kwchs-naka.edu.ng / Registrar@2025</p>
              <p>Bursar — bursar@kwchs-naka.edu.ng / Bursar@2025</p>
              <p>Student — KWLCHS/2025/MLT/001 / student123</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
