import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { getAdminFromCookie } from '@/lib/auth'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromCookie()
  if (!admin) {
    redirect('/admin/login')
  }

  return (
    <div className="bg-[#050816]">
      <AdminSidebar />
      <div className="ml-64 min-h-screen flex flex-col">{children}</div>
    </div>
  )
}
