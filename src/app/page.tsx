import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { AppShell } from '@/components/app-shell'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  const settings = await db.setting.findUnique({
    where: { id: 'main' },
    select: {
      schoolName: true,
      shortName: true,
      motto: true,
      about: true,
      address: true,
      phone: true,
      email: true,
      whatsappLine: true,
      currentSession: true,
      admissionOpen: true,
    },
  })

  return (
    <AppShell
      session={session}
      school={{
        schoolName: settings?.schoolName || 'College of Health Sciences and Technology',
        shortName: settings?.shortName || 'KWLCHS Naka',
        motto: settings?.motto || '',
        about: settings?.about || '',
        address: settings?.address || 'Naka, Benue State',
        phone: settings?.phone || '',
        email: settings?.email || '',
        whatsappLine: settings?.whatsappLine || '',
        currentSession: settings?.currentSession || '',
        admissionOpen: settings?.admissionOpen ?? true,
      }}
    />
  )
}
