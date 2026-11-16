'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SessionPayload } from '@/lib/auth'
import { logout } from '@/lib/actions/auth'
import { PublicSite } from '@/components/public/public-site'
import { LoginView } from '@/components/shared/login-view'
import { StudentPortal } from '@/components/student/student-portal'
import { AdminPanel } from '@/components/admin/admin-panel'

export type SchoolInfo = {
  schoolName: string
  shortName: string
  motto: string
  about: string
  address: string
  phone: string
  email: string
  whatsappLine: string
  currentSession: string
  admissionOpen: boolean
}

export function AppShell({ session, school }: { session: SessionPayload | null; school: SchoolInfo }) {
  const [hash, setHash] = useState<string>('')

  useEffect(() => {
    const read = () => setHash(window.location.hash)
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  const navigate = useCallback((path: string) => {
    const target = path.startsWith('#') ? path : `#${path}`
    window.location.assign(target)
    window.scrollTo({ top: 0 })
  }, [])

  const onLogout = useCallback(async () => {
    await logout()
    window.location.assign('/#/')
    window.location.reload()
  }, [])

  const view = hash.replace(/^#/, '') || '/'

  // Student portal
  if (view.startsWith('/portal')) {
    if (session?.type !== 'STUDENT') {
      return (
        <LoginView
          defaultTab="student"
          school={school}
          notice="Please sign in with your matriculation number to access the student portal."
          goPublic={() => navigate('/')}
        />
      )
    }
    return (
      <StudentPortal
        school={school}
        session={session}
        navigate={navigate}
        onLogout={onLogout}
      />
    )
  }

  // Admin backends
  if (view.startsWith('/admin')) {
    if (session?.type !== 'ADMIN') {
      return (
        <LoginView
          defaultTab="admin"
          school={school}
          notice="Staff access only. Sign in with your official email to manage the College."
          goPublic={() => navigate('/')}
        />
      )
    }
    return (
      <AdminPanel
        school={school}
        session={session}
        navigate={navigate}
        onLogout={onLogout}
      />
    )
  }

  // Public pages
  if (view === '/apply') {
    return <PublicSite school={school} page="apply" navigate={navigate} session={session} />
  }
  if (view === '/status') {
    return <PublicSite school={school} page="status" navigate={navigate} session={session} />
  }
  if (view.startsWith('/login')) {
    return (
      <LoginView
        defaultTab={view.includes('admin') ? 'admin' : 'student'}
        school={school}
        goPublic={() => navigate('/')}
      />
    )
  }

  return <PublicSite school={school} page="home" navigate={navigate} session={session} />
}
