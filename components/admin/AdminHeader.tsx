'use client'

import { User, Bell } from 'lucide-react'

interface AdminHeaderProps {
  title: string
  adminEmail?: string
}

export default function AdminHeader({ title, adminEmail }: AdminHeaderProps) {
  return (
    <header className="h-16 bg-[#030712] border-b border-white/10 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-white font-bold text-xl">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-300 text-sm max-w-[160px] truncate">
            {adminEmail || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  )
}
