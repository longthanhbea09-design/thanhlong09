'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'Bao lâu tôi nhận được dịch vụ sau khi đặt hàng?',
    a: 'Sau khi bạn gửi đơn hàng, ThanhLongShop sẽ liên hệ với bạn trong vòng 5–10 phút (trong giờ hoạt động 8:00–23:00). Chúng tôi sẽ xác nhận đơn, hướng dẫn thanh toán và kích hoạt dịch vụ cho bạn ngay sau đó.',
  },
  {
    q: 'Tôi có cần tạo tài khoản không?',
    a: 'Hoàn toàn không! Bạn chỉ cần nhập họ tên và số điện thoại là có thể đặt hàng ngay. Không cần email, không cần mật khẩu, không cần tạo tài khoản gì cả.',
  },
  {
    q: 'Có hỗ trợ người lớn tuổi không rành điện thoại không?',
    a: 'Có! Đây là điểm mạnh của ThanhLongShop. Chúng tôi hướng dẫn từng bước một qua Zalo, gọi điện hoặc thậm chí video call. Không cần bạn phải tự làm — chúng tôi sẽ hỗ trợ đến khi bạn sử dụng được.',
  },
  {
    q: 'Nếu gặp lỗi trong quá trình sử dụng thì xử lý thế nào?',
    a: 'Bạn nhắn tin Zalo cho ThanhLongShop, mô tả vấn đề đang gặp. Chúng tôi sẽ phản hồi và hỗ trợ trong thời gian nhanh nhất. Nếu lỗi do dịch vụ gốc, chúng tôi sẽ xử lý hoặc gia hạn thêm thời gian sử dụng cho bạn.',
  },
  {
    q: 'Thanh toán bằng hình thức nào?',
    a: 'Hiện tại ThanhLongShop nhận thanh toán qua chuyển khoản ngân hàng. Bạn chuyển tiền sau khi đã được nhân viên xác nhận đơn hàng. Nội dung chuyển khoản ghi: TLS + số điện thoại của bạn.',
  },
  {
    q: 'Có bảo hành không? Bảo hành như thế nào?',
    a: 'Có! Chúng tôi bảo hành trong toàn bộ thời gian sử dụng bạn đã mua. Nếu dịch vụ gặp lỗi do nguyên nhân từ hệ thống, chúng tôi sẽ hỗ trợ xử lý hoặc gia hạn miễn phí. Xem chi tiết tại mục Bảo hành ở trên.',
  },
  {
    q: 'Tôi có thể liên hệ qua Zalo không?',
    a: 'Có! Zalo là kênh hỗ trợ chính của ThanhLongShop. Bạn có thể nhắn tin Zalo số 0924 555 517 bất cứ lúc nào từ 8:00 đến 23:00 hằng ngày. Chúng tôi phản hồi nhanh nhất có thể.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm mb-4">
            <HelpCircle className="w-4 h-4" />
            Câu hỏi thường gặp
          </div>
          <h2 className="section-title">Giải đáp thắc mắc</h2>
          <p className="section-subtitle">
            Không tìm thấy câu trả lời? Nhắn Zalo để được hỗ trợ trực tiếp
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={cn(
                'glass rounded-2xl border transition-all duration-200',
                openIndex === i ? 'border-cyan-400/30' : 'border-white/10 hover:border-white/20'
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
              >
                <span className="text-white font-semibold text-base leading-snug">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200',
                    openIndex === i && 'rotate-180 text-cyan-400'
                  )}
                />
              </button>

              {openIndex === i && (
                <div className="px-6 pb-6">
                  <p className="text-slate-400 leading-relaxed text-base">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
