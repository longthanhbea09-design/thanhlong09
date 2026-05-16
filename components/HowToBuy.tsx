import { MousePointer2, ClipboardList, Zap, ArrowRight } from 'lucide-react'
import FadeIn from './FadeIn'


const steps = [
  {
    number: '01',
    icon: MousePointer2,
    title: 'Chọn sản phẩm & gói',
    desc: 'Duyệt danh sách sản phẩm, chọn gói phù hợp với nhu cầu. Bấm "Mua ngay" để bắt đầu.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    number: '02',
    icon: ClipboardList,
    title: 'Nhập thông tin & thanh toán',
    desc: 'Điền họ tên, số điện thoại và email nhận tài khoản. Quét mã QR để thanh toán — chỉ mất vài giây.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Nhận tài khoản tự động',
    desc: 'Hệ thống xác nhận thanh toán và giao tài khoản ngay lập tức — không cần chờ, không cần liên hệ.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
]

export default function HowToBuy() {
  return (
    <section id="how-to-buy" className="py-20 relative scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-14">
          <h2 className="section-title">Mua hàng chỉ 3 bước</h2>
          <p className="section-subtitle">
            Thanh toán xong là nhận tài khoản ngay — không cần chờ, không cần tạo tài khoản
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector arrows */}
          <div className="hidden md:flex absolute top-16 left-1/3 -translate-x-1/2 items-center">
            <ArrowRight className="w-8 h-8 text-white/10" />
          </div>
          <div className="hidden md:flex absolute top-16 left-2/3 -translate-x-1/2 items-center">
            <ArrowRight className="w-8 h-8 text-white/10" />
          </div>

          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 150}>
            <div
              className={`glass rounded-2xl p-8 text-center card-hover border ${step.border} relative`}
            >
              {/* Step number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#050816] border-2 border-white/20 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-400">{i + 1}</span>
              </div>

              <div className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center mx-auto mb-6`}>
                <step.icon className={`w-8 h-8 ${step.color}`} />
              </div>

              <div className={`text-5xl font-black ${step.color} opacity-20 absolute top-6 right-6`}>
                {step.number}
              </div>

              <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
            </FadeIn>
          ))}
        </div>

        {/* Note */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm">
            💡 Cần hỗ trợ? Liên hệ Zalo bất cứ lúc nào — mình phản hồi nhanh
          </div>
        </div>
      </div>
    </section>
  )
}
