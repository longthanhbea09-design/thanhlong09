'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, Phone, Zap, Search } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'products', label: 'Sản phẩm' },
  { id: 'how-to-buy', label: 'Cách mua' },
  { id: 'pricing', label: 'Bảng giá' },
  { id: 'warranty', label: 'Bảo hành' },
  { id: 'contact', label: 'Liên hệ' },
]

export default function Header() {
  const [activeId, setActiveId] = useState('home')
  const [isOpen, setIsOpen] = useState(false)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 })
  const navRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const isClickScrolling = useRef(false)

  // Move pill to active item
  useEffect(() => {
    const btn = itemRefs.current[activeId]
    const nav = navRef.current
    if (!btn || !nav) return
    const navRect = nav.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setPillStyle({
      left: btnRect.left - navRect.left,
      width: btnRect.width,
    })
  }, [activeId])

  // IntersectionObserver to detect which section is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isClickScrolling.current) {
            setActiveId(id)
          }
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const scrollTo = (id: string) => {
    setIsOpen(false)
    setActiveId(id)
    isClickScrolling.current = true
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Release lock after scroll animation completes
    setTimeout(() => { isClickScrolling.current = false }, 900)
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">
      {/* Floating pill container */}
      <div className="pointer-events-auto w-[96%] max-w-6xl mt-3">
        <div className="header-glass flex items-center justify-between gap-3 rounded-full border border-white/10 px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.55)]" style={{ WebkitBackdropFilter: 'blur(24px)' }}>

          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2 shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-bold text-base text-white">ThanhLong</span>
              <span className="font-bold text-base bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Shop</span>
            </div>
          </a>

          {/* Desktop nav — pill track */}
          <nav
            ref={navRef}
            className="relative hidden lg:flex items-center"
            aria-label="Navigation"
          >
            {/* Sliding background pill */}
            <span
              aria-hidden
              className="absolute top-0 h-full rounded-full bg-cyan-500/15 border border-cyan-500/25 shadow-[0_0_16px_rgba(34,211,238,0.2)] transition-all duration-300 ease-out"
              style={{ left: pillStyle.left, width: pillStyle.width }}
            />

            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                ref={(el) => { itemRefs.current[item.id] = el }}
                onClick={() => scrollTo(item.id)}
                className={`relative z-10 px-3.5 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                  activeId === item.id
                    ? 'text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tra cứu đơn — desktop */}
            <a
              href="/orders/lookup"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/20"
            >
              <Search className="w-3.5 h-3.5" />
              Tra cứu đơn
            </a>

            {/* Zalo CTA */}
            <a
              href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || '0924555517'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gọi/Zalo</span>
              <span className="sm:hidden">Zalo</span>
            </a>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isOpen && (
          <div className="mt-2 rounded-[28px] border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeId === item.id
                      ? 'bg-cyan-500/15 border border-cyan-500/25 text-cyan-300'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                  {activeId === item.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </button>
              ))}
              <a
                href="/orders/lookup"
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
              >
                <Search className="w-4 h-4" />
                Tra cứu đơn hàng
              </a>
              <div className="pt-1">
                <a
                  href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || '0924555517'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Gọi/Zalo hỗ trợ ngay
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
