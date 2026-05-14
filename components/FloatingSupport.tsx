'use client'

import { useState } from 'react'
import { MessageCircle, X, Phone, Facebook } from 'lucide-react'

interface FloatingSupportProps {
  zalo?: string
}

export default function FloatingSupport({ zalo = '0924555517' }: FloatingSupportProps) {
  const [isOpen, setIsOpen] = useState(false)

  const contacts = [
    {
      icon: MessageCircle,
      label: 'Zalo',
      href: `https://zalo.me/${zalo}`,
      color: 'bg-blue-500 hover:bg-blue-400',
    },
    {
      icon: Phone,
      label: 'Gọi ngay',
      href: `tel:${zalo}`,
      color: 'bg-green-500 hover:bg-green-400',
    },
    {
      icon: Facebook,
      label: 'Facebook',
      href: 'https://facebook.com',
      color: 'bg-indigo-500 hover:bg-indigo-400',
    },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Contact options */}
      {isOpen && (
        <div className="flex flex-col gap-2 items-end animate-slide-up">
          {contacts.map((contact) => (
            <a
              key={contact.label}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl ${contact.color} text-white font-medium text-sm shadow-xl transition-all duration-200 active:scale-95`}
            >
              <contact.icon className="w-4 h-4" />
              {contact.label}
            </a>
          ))}
          <div className="text-right">
            <p className="text-xs text-slate-400 mr-1">Cần hỗ trợ?</p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl transition-all duration-200 flex items-center justify-center active:scale-95 ${
          isOpen
            ? 'bg-slate-700 hover:bg-slate-600'
            : 'bg-gradient-to-br from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 shadow-cyan-500/40 animate-pulse-slow'
        }`}
        aria-label="Hỗ trợ"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {!isOpen && (
        <span className="text-xs text-slate-400 text-center -mt-1">Hỗ trợ</span>
      )}
    </div>
  )
}
