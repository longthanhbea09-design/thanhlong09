import { MessageCircle, Facebook, Send, Mail, Clock, Phone } from 'lucide-react'
import type { Setting } from '@/types'
import FadeIn from './FadeIn'

interface ContactSectionProps {
  settings: Setting | null
}

export default function ContactSection({ settings }: ContactSectionProps) {
  const zalo = settings?.zalo || '0924555517'
  const zaloDisplay = zalo.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')

  const contacts = [
    {
      icon: MessageCircle,
      label: 'Zalo (ưu tiên)',
      value: zaloDisplay,
      href: `https://zalo.me/${zalo}`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      desc: 'Phản hồi nhanh nhất',
    },
    {
      icon: Phone,
      label: 'Gọi điện',
      value: zaloDisplay,
      href: `tel:${zalo}`,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      desc: 'Hỗ trợ trực tiếp',
    },
    {
      icon: Facebook,
      label: 'Facebook',
      value: settings?.facebook || 'Thành Long',
      href: 'https://facebook.com',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      desc: 'Nhắn tin fanpage',
    },
    {
      icon: Send,
      label: 'Telegram',
      value: settings?.telegram || '@thanhlongshop',
      href: 'https://t.me/thanhlongshop',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      desc: 'Chat nhanh',
    },
    {
      icon: Mail,
      label: 'Email',
      value: settings?.supportEmail || 'support@thanhlongshop.net',
      href: `mailto:${settings?.supportEmail || 'support@thanhlongshop.net'}`,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      desc: 'Cho vấn đề phức tạp',
    },
    {
      icon: Clock,
      label: 'Giờ hỗ trợ',
      value: '8:00 – 23:00 hàng ngày',
      href: null,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      desc: 'Kể cả cuối tuần',
    },
  ]

  return (
    <section id="contact" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12">
          <h2 className="section-title">Liên hệ hỗ trợ</h2>
          <p className="section-subtitle">
            Luôn có người sẵn sàng hỗ trợ bạn — đặc biệt thân thiện với người không quen công nghệ
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {contacts.map((contact, i) => (
            <FadeIn key={i} delay={i * 80}>
            <div className={`glass rounded-2xl p-6 border ${contact.border} card-hover`}>
              <div className={`w-12 h-12 rounded-xl ${contact.bg} flex items-center justify-center mb-4`}>
                <contact.icon className={`w-6 h-6 ${contact.color}`} />
              </div>
              <p className="text-slate-400 text-sm mb-1">{contact.label}</p>
              {contact.href ? (
                <a
                  href={contact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-bold text-base ${contact.color} hover:underline block mb-1`}
                >
                  {contact.value}
                </a>
              ) : (
                <p className={`font-bold text-base ${contact.color} mb-1`}>{contact.value}</p>
              )}
              <p className="text-slate-500 text-xs">{contact.desc}</p>
            </div>
            </FadeIn>
          ))}
        </div>

        {/* Main CTA */}
        <div className="text-center">
          <a
            href={`https://zalo.me/${zalo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold text-lg transition-all duration-200 shadow-xl shadow-blue-500/25 active:scale-95"
          >
            <MessageCircle className="w-6 h-6" />
            Nhắn Zalo ngay — {zaloDisplay}
          </a>
          <p className="text-slate-500 text-sm mt-4">
            Phản hồi trong vòng 5 phút trong giờ hỗ trợ
          </p>
        </div>
      </div>
    </section>
  )
}
