'use client'

import { Check, Star } from 'lucide-react'
import FadeIn from './FadeIn'

const plans = [
  {
    name: 'Gói 1 tháng',
    duration: '1 tháng',
    desc: 'Phù hợp để dùng thử và trải nghiệm',
    highlight: false,
    badge: null,
    features: [
      'Hỗ trợ cài đặt miễn phí',
      'Hướng dẫn sử dụng chi tiết',
      'Liên hệ Zalo hỗ trợ',
      'Bảo hành trong thời hạn',
    ],
    cta: 'Chọn gói này',
    note: 'Giá linh hoạt theo từng sản phẩm',
  },
  {
    name: 'Gói 1 năm',
    duration: '1 năm',
    desc: 'Tiết kiệm nhất — Dùng cả năm không lo',
    highlight: true,
    badge: 'Tiết kiệm nhất',
    features: [
      'Tiết kiệm lớn so với mua theo tháng',
      'Ưu tiên hỗ trợ cao nhất',
      'Hỗ trợ Zalo 24/7',
      'Bảo hành đầy đủ 12 tháng',
      'Nhắc hạn sử dụng định kỳ',
    ],
    cta: 'Chọn gói này',
    note: 'Phù hợp khách dùng lâu dài',
  },
]

export default function PricingSection() {
  const scrollToOrder = () => {
    document.querySelector('#order-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="pricing" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-14">
          <h2 className="section-title">Chọn gói phù hợp với nhu cầu</h2>
          <p className="section-subtitle">
            Mỗi sản phẩm có giá khác nhau — gói dài hạn luôn tiết kiệm hơn gói ngắn
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 items-start max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <FadeIn key={i} delay={i * 150}>
            <div
              className={`rounded-2xl p-8 flex flex-col gap-6 card-hover relative ${
                plan.highlight
                  ? 'bg-gradient-to-b from-cyan-500/10 to-emerald-500/10 border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10'
                  : 'glass border border-white/10'
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                      : 'bg-white/10 border border-white/20 text-white'
                  }`}
                >
                  {plan.highlight && <Star className="inline w-3 h-3 mr-1" />}
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className={`text-2xl font-bold mb-1 ${plan.highlight ? 'gradient-text' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm">{plan.desc}</p>
              </div>

              <div className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-slate-400 text-sm">Thời hạn sử dụng</p>
                <p className="text-white font-bold text-xl">{plan.duration}</p>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div>
                <p className="text-slate-500 text-xs text-center mb-3">{plan.note}</p>
                <button
                  onClick={scrollToOrder}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-95 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-emerald-400'
                      : 'border border-white/20 text-white hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
            </FadeIn>
          ))}
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Không biết chọn gói nào?{' '}
          <a
            href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || '0924555517'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline"
          >
            Nhắn Zalo để được tư vấn miễn phí →
          </a>
        </p>
      </div>
    </section>
  )
}
