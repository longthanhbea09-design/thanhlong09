import { Users, Zap, Shield, HeartHandshake } from 'lucide-react'
import FadeIn from './FadeIn'

const stats = [
  {
    icon: Users,
    value: '1.000+',
    label: 'Khách hàng tin dùng',
    desc: 'Phục vụ hàng nghìn khách từ nhiều tỉnh thành',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: Zap,
    value: '5 phút',
    label: 'Giao đơn nhanh chóng',
    desc: 'Xử lý và liên hệ khách hàng trong vòng 5 phút',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: Shield,
    value: '100%',
    label: 'Bảo hành rõ ràng',
    desc: 'Cam kết bảo hành trong thời gian sử dụng',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: HeartHandshake,
    value: '24/7',
    label: 'Hỗ trợ nhiệt tình',
    desc: 'Đặc biệt thân thiện với người không rành công nghệ',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
]

export default function Stats() {
  return (
    <section className="py-16 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <FadeIn key={i} delay={i * 120}>
            <div
              className={`glass rounded-2xl p-6 card-hover border ${stat.border}`}
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-extrabold ${stat.color} mb-1`}>{stat.value}</p>
              <p className="text-white font-semibold mb-1">{stat.label}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{stat.desc}</p>
            </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
