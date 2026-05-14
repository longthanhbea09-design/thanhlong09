import { Wrench, MessageCircle, Facebook, Send } from 'lucide-react'
import type { Setting } from '@/types'

interface Props {
  settings: Setting | null
}

export default function MaintenancePage({ settings }: Props) {
  const title = settings?.maintenanceTitle || 'Website đang bảo trì'
  const message =
    settings?.maintenanceMessage ||
    'ThanhLongShop đang nâng cấp hệ thống, vui lòng quay lại sau ít phút.'
  const zalo = settings?.zalo || '0924555517'
  const zaloLink = settings?.zaloLink || `https://zalo.me/${zalo}`
  const facebookLink = settings?.facebookLink
  const telegramLink = settings?.telegramLink

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center">
          <Wrench className="w-12 h-12 text-cyan-400" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{title}</h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-10">{message}</p>

        {(zaloLink || facebookLink || telegramLink) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={zaloLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Zalo hỗ trợ
            </a>
            {facebookLink && (
              <a
                href={facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-all font-medium"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </a>
            )}
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all font-medium"
              >
                <Send className="w-4 h-4" />
                Telegram
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
