import { Suspense } from 'react'
import { RefreshCw } from 'lucide-react'
import MomoReturnClient from './MomoReturnClient'

// Always render on demand — page reads MoMo URL params at request time
export const dynamic = 'force-dynamic'

export default function MomoReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050816] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Đang kiểm tra kết quả thanh toán...</p>
          </div>
        </div>
      }
    >
      <MomoReturnClient />
    </Suspense>
  )
}
