import { Shield, Check, X, HeartHandshake } from 'lucide-react'
import FadeIn from './FadeIn'

const covered = [
  'Lỗi do hệ thống hoặc dịch vụ gốc gây ra',
  'Tài khoản bị lỗi, không đăng nhập được',
  'Tính năng Pro bị tắt đột ngột trong thời hạn',
  'Hỗ trợ cài đặt lại nếu đổi thiết bị trong thời hạn',
]

const notCovered = [
  'Tự ý thay đổi thông tin tài khoản',
  'Chia sẻ tài khoản cho người khác sử dụng',
  'Vi phạm chính sách của nền tảng gốc',
  'Quên mật khẩu do bản thân thay đổi',
]

export default function WarrantySection() {
  return (
    <section id="warranty" className="py-20 relative scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm mb-4">
            <Shield className="w-4 h-4" />
            Chính sách bảo hành
          </div>
          <h2 className="section-title">Cam kết bảo hành rõ ràng</h2>
          <p className="section-subtitle">
            Minh bạch về những gì chúng tôi hỗ trợ và những gì ngoài phạm vi bảo hành
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Covered */}
          <FadeIn delay={100}>
          <div className="glass rounded-2xl p-8 border border-emerald-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Được bảo hành</h3>
            </div>
            <ul className="space-y-3">
              {covered.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          </FadeIn>

          {/* Not covered */}
          <FadeIn delay={200}>
          <div className="glass rounded-2xl p-8 border border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Không bảo hành</h3>
            </div>
            <ul className="space-y-3">
              {notCovered.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          </FadeIn>
        </div>

        {/* Special note */}
        <FadeIn delay={100}>
        <div className="glass rounded-2xl p-8 border border-cyan-500/20 flex flex-col sm:flex-row items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2">
              Hỗ trợ đặc biệt cho người không rành công nghệ
            </h3>
            <p className="text-slate-400 leading-relaxed">
              ThanhLongShop hiểu rằng không phải ai cũng quen với công nghệ. Chúng tôi sẵn sàng hướng dẫn từng bước
              qua Zalo, gọi điện hoặc video call nếu cần. Đặc biệt thân thiện với khách hàng lớn tuổi —
              không cần lo lắng, chúng tôi hỗ trợ tận tình đến khi bạn sử dụng được.
            </p>
          </div>
        </div>
        </FadeIn>
      </div>
    </section>
  )
}
