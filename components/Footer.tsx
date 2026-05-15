import { Zap, MessageCircle, Shield, Heart } from 'lucide-react'
import type { Setting } from '@/types'

interface FooterProps {
  settings: Setting | null
}

export default function Footer({ settings }: FooterProps) {
  const zalo = settings?.zalo || '0924555517'

  return (
    <footer className="border-t border-white/10 bg-[#030712]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">ThanhLongShop</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              Cung cấp gói dịch vụ số uy tín, giao nhanh, hỗ trợ tận tâm.
              Đặc biệt thân thiện với khách hàng không rành công nghệ.
            </p>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
              Domain: <span className="text-white font-medium">thanhlongshop.net</span>
            </div>
            <a
              href={settings?.zaloLink || `https://zalo.me/${zalo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Zalo: {zalo.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
            </a>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">Điều hướng</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Trang chủ', href: '/' },
                { label: 'Sản phẩm', href: '#products' },
                { label: 'Cách mua hàng', href: '#how-to-buy' },
                { label: 'Bảng giá', href: '#pricing' },
                { label: 'Bảo hành', href: '#warranty' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Liên hệ', href: '#contact' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">Chính sách</h4>
            <ul className="space-y-2.5">
              {[
                'Chính sách bảo hành',
                'Chính sách thanh toán',
                'Chính sách bảo mật',
                'Điều khoản dịch vụ',
              ].map((policy) => (
                <li key={policy}>
                  <span className="text-slate-400 text-sm cursor-default">
                    {policy}
                  </span>
                </li>
              ))}
            </ul>

          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm text-center sm:text-left">
            © 2026 ThanhLongShop. All rights reserved.
          </p>
          <p className="text-slate-600 text-sm flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> by ThanhLongShop
          </p>
        </div>
      </div>
    </footer>
  )
}
