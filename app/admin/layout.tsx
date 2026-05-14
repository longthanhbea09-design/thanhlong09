import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = {
  title: 'Admin — ThanhLongShop',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050816] flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</div>
    </div>
  )
}
