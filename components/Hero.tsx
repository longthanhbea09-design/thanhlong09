'use client'

import { ArrowRight, MessageCircle, Users, Clock, Star, Shield } from 'lucide-react'

const stats = [
  { icon: Users, value: '1.000+', label: 'Khách hàng tin dùng' },
  { icon: Clock, value: '5 phút', label: 'Xử lý đơn hàng' },
  { icon: MessageCircle, value: '24/7', label: 'Hỗ trợ qua Zalo' },
  { icon: Star, value: '98%', label: 'Khách hàng hài lòng' },
]

export default function Hero() {
  const scrollToProducts = () => {
    document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' })
  }


  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden scroll-mt-20">
      {/* Background effects */}
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Uy tín · Nhanh chóng · Hỗ trợ tận tâm
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold" style={{ lineHeight: '1.4' }}>
                <span className="text-white block mb-1">Mua gói dịch vụ số</span>
                <span className="gradient-text block mb-1">nhanh chóng</span>
                <span className="gradient-text block mb-1">uy tín</span>
                <span className="text-white block">tại ThanhLongShop</span>
              </h1>
              <p className="text-slate-400 text-lg sm:text-xl leading-relaxed max-w-lg">
                Cung cấp CapCut Pro, ChatGPT Plus, Canva Pro, YouTube Premium và nhiều dịch vụ số khác.
                Giao trong 5 phút, hỗ trợ qua Zalo, bảo hành rõ ràng.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={scrollToProducts}
                className="btn-primary text-base px-8 py-4"
              >
                Xem sản phẩm
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || '0924555517'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-base px-8 py-4"
              >
                <MessageCircle className="w-5 h-5" />
                Nhắn Zalo hỗ trợ
              </a>
            </div>

            {/* Trust icons */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Bảo hành rõ ràng
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Giao nhanh 5 phút
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Đánh giá 4.9/5
              </div>
            </div>
          </div>

          {/* Right: Dashboard card */}
          <div className="hidden lg:block">
            <div className="glass rounded-3xl p-6 space-y-4 animate-float">
              {/* Header card */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-slate-400 text-sm">Hệ thống đang hoạt động</p>
                  <h3 className="text-white font-bold text-lg">ThanhLongShop Dashboard</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-xs font-medium">Online</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-cyan-400/30 transition-all duration-200"
                  >
                    <stat.icon className="w-6 h-6 text-cyan-400 mb-2" />
                    <p className="text-white font-bold text-xl">{stat.value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent order */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Đơn hàng gần đây</p>
                {[
                  { name: 'Nguyễn Văn A', product: 'ChatGPT Plus', status: 'Hoàn thành', color: 'text-emerald-400' },
                  { name: 'Trần Thị B', product: 'SuperGrok', status: 'Đang xử lý', color: 'text-cyan-400' },
                  { name: 'Lê Văn C', product: 'Gemini Pro', status: 'Mới', color: 'text-blue-400' },
                ].map((order, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{order.name}</p>
                      <p className="text-slate-400 text-xs">{order.product}</p>
                    </div>
                    <span className={`text-xs font-medium ${order.color}`}>{order.status}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={scrollToProducts}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Mua hàng →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
