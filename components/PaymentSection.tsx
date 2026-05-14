import { QrCode, CreditCard, AlertCircle } from 'lucide-react'
import type { Setting } from '@/types'

interface PaymentSectionProps {
  settings: Setting | null
}

export default function PaymentSection({ settings }: PaymentSectionProps) {
  const bankName = settings?.bankName || 'Vietcombank'
  const bankAccount = settings?.bankAccount || '1234567890'
  const bankOwner = settings?.bankOwner || 'NGUYEN THANH LONG'

  return (
    <section id="payment" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title">Thông tin thanh toán</h2>
          <p className="section-subtitle">
            Chờ nhân viên liên hệ xác nhận trước khi chuyển khoản
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bank transfer */}
          <div className="glass rounded-2xl p-8 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Chuyển khoản ngân hàng</h3>
                <p className="text-slate-400 text-sm">Nhận xác nhận nhanh trong 2 phút</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Ngân hàng', value: bankName },
                { label: 'Số tài khoản', value: bankAccount },
                { label: 'Chủ tài khoản', value: bankOwner },
                { label: 'Nội dung CK', value: 'TLS + Số điện thoại của bạn' },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                  <span className="text-slate-400 text-sm shrink-0">{item.label}</span>
                  <span className="text-white font-semibold text-sm text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR code */}
          <div className="glass rounded-2xl p-8 border border-white/10 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg">Quét QR Code</h3>

            {settings?.qrCodeUrl ? (
              <img
                src={settings.qrCodeUrl}
                alt="QR Code thanh toán"
                className="w-48 h-48 rounded-xl object-contain bg-white p-2"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2">
                <QrCode className="w-12 h-12 text-slate-600" />
                <p className="text-slate-500 text-sm">QR code sẽ cập nhật sớm</p>
              </div>
            )}

            <p className="text-slate-400 text-sm">
              Hoặc nhắn Zalo để nhận QR code thanh toán trực tiếp
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold mb-1">Lưu ý khi thanh toán</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Vui lòng chờ nhân viên ThanhLongShop liên hệ và xác nhận đơn hàng trước khi chuyển khoản.
              Nội dung chuyển khoản ghi: <strong className="text-white">TLS</strong> + số điện thoại của bạn.
              Ví dụ: <strong className="text-white">TLS0912345678</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
