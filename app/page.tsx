import { prisma } from '@/lib/prisma'
import HomeClient from '@/components/HomeClient'
import MaintenancePage from '@/components/MaintenancePage'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await prisma.setting.findFirst({ where: { id: 'singleton' } })

  if (settings?.maintenanceMode) {
    return <MaintenancePage settings={settings} />
  }

  return <HomeClient />
}
