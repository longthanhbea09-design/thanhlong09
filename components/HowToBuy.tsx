import { MousePointer2, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react'
import FadeIn from './FadeIn'


const steps = [
  {
    number: '01',
    icon: MousePointer2,
    title: 'Chọn sản phẩm phù hợp',
    desc: 'Duyệt qua danh sách sản phẩm, chọn gói dịch vụ phù hợp với nhu cầu của bạn. Bấm "Mua ngay" để bắt đầu.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    number: '02',
    icon: ClipboardList,
    title: 'Điền thông tin liên hệ',
    desc: 'Chỉ cần nhập họ tên và số điện thoại. Không cần tạo tài khoản, không cần mật khẩu. Đơn giản và nhanh chóng.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Nhận hỗ trợ và kích hoạt',
    desc: 'ThanhLongShop liên hệ trong vòng 5 phút, hướng dẫn thanh toán và kích hoạt dịch vụ cho bạn tận tay.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
]

export default function HowToBuy() {
  return (
    <section id="how-to-buy" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-14">
          <h2 className="section-title">Cách mua hàng đơn giản</h2>
          <p className="section-subtitle">
            Chỉ 3 bước là xong — không cần tạo tài khoản, không cần nhớ mật khẩu
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
            💡 Bạn có thể liên hệ Zalo bất cứ lúc nào để được hướng dẫn từng bước
          </div>
        </div>
      </div>
    </section>
  )
}
