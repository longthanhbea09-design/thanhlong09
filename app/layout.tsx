import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ThanhLongShop - Dịch vụ số uy tín, giao nhanh, hỗ trợ tận tâm',
  description:
    'ThanhLongShop cung cấp các gói dịch vụ số như CapCut Pro, ChatGPT Plus, Canva Pro, YouTube Premium và nhiều dịch vụ khác. Giao nhanh, hỗ trợ tận tâm, bảo hành rõ ràng.',
  keywords: 'mua ChatGPT Plus, CapCut Pro, Canva Pro, YouTube Premium, Netflix, dịch vụ số, gói dịch vụ số',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'ThanhLongShop - Dịch vụ số uy tín',
    description: 'Dịch vụ số uy tín, giao nhanh, hỗ trợ tận tâm',
    url: 'https://thanhlongshop.net',
    siteName: 'ThanhLongShop',
    locale: 'vi_VN',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#050816] text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
