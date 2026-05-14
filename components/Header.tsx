'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Phone, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Trang chủ' },
  { href: '#products', label: 'Sản phẩm' },
  { href: '#how-to-buy', label: 'Cách mua' },
  { href: '#pricing', label: 'Bảng giá' },
  { href: '#warranty', label: 'Bảo hành' },
  { href: '#contact', label: 'Liên hệ' },
  { href: '/orders/lookup', label: 'Tra cứu đơn', isPage: true },
]

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href: string, isPage?: boolean) => {
    setIsOpen(false)
    if (isPage) {
      window.location.href = href
    } else if (href.startsWith('#')) {
      const el = document.querySelector(href)
      el?.scrollIntoView({ behavior: 'smooth' })
    } else if (href === '/') {
      window.location.href = '/'
    }
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform-gpu will-change-transform',
        scrolled
          ? 'bg-[#050816]/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white leading-none">ThanhLong</span>
              <span className="font-bold text-lg leading-none gradient-text">Shop</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href, link.isPage)}
                className={`px-3 py-2 text-sm rounded-lg transition-all duration-150 ${'isPage' in link && link.isPage ? 'text-cyan-400 hover:text-white hover:bg-cyan-500/10' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA button */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || '0924555517'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-95"
            >
              <Phone className="w-4 h-4" />
              Gọi/Zalo hỗ trợ
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="lg:hidden bg-[#050816]/98 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href, link.isPage)}
                className={`block w-full text-left px-4 py-3 rounded-xl transition-all text-base ${'isPage' in link && link.isPage ? 'text-cyan-400 hover:text-white hover:bg-cyan-500/10' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3">
              <a
                href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || '0924555517'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-base"
              >
                <Phone className="w-5 h-5" />
                Gọi/Zalo hỗ trợ ngay
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
