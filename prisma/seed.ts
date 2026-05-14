import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...')

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@thanhlongshop.net'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      role: 'admin',
    },
  })
  console.log(`✅ Admin tạo xong: ${adminEmail}`)

  // Settings
  await prisma.setting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      shopName: 'ThanhLongShop',
      zalo: '0924555517',
      facebook: 'Thành Long',
      telegram: '@thanhlongshop',
      supportEmail: 'support@thanhlongshop.net',
      bankName: 'Vietcombank',
      bankAccount: '1234567890',
      bankOwner: 'NGUYEN THANH LONG',
    },
  })
  console.log('✅ Settings tạo xong')

  // Xóa sản phẩm không còn bán nữa
  const slugsToRemove = ['canva-pro', 'youtube-premium', 'netflix', 'grammarly-premium', 'duolingo-super']
  for (const slug of slugsToRemove) {
    const product = await prisma.product.findUnique({ where: { slug } })
    if (product) {
      const hasOrders = await prisma.order.findFirst({ where: { productId: product.id } })
      if (hasOrders) {
        await prisma.product.update({ where: { slug }, data: { isActive: false } })
        console.log(`⏸️ Ẩn sản phẩm (có đơn hàng): ${slug}`)
      } else {
        await prisma.productPlan.deleteMany({ where: { productId: product.id } })
        await prisma.product.delete({ where: { slug } })
        console.log(`🗑️ Xóa sản phẩm: ${slug}`)
      }
    }
  }

  // Products
  const products = [
    {
      name: 'ChatGPT Plus',
      slug: 'chatgpt-plus',
      category: 'AI',
      description: 'Hỗ trợ sử dụng công cụ AI mạnh mẽ GPT-4o cho học tập, làm việc, viết lách và sáng tạo nội dung. Tốc độ nhanh, không giới hạn tin nhắn.',
      priceFrom: 99000,
      badge: 'Bán chạy',
      icon: '🤖',
      isFeatured: true,
      plans: [
        { name: '1 tháng', duration: '1 tháng', price: 99000, description: 'Phù hợp dùng thử' },
        { name: '1 năm', duration: '1 năm', price: 990000, description: 'Tiết kiệm nhất' },
      ],
    },
    {
      name: 'CapCut Pro',
      slug: 'capcut-pro',
      category: 'Thiết kế',
      description: 'Chỉnh sửa video chuyên nghiệp với template pro, hiệu ứng AI nâng cao, xóa watermark, tạo video tự động bằng AI.',
      priceFrom: 79000,
      badge: 'Giá tốt',
      icon: '🎬',
      isFeatured: true,
      plans: [
        { name: '1 tháng', duration: '1 tháng', price: 79000, description: 'Phù hợp dùng thử' },
        { name: '1 năm', duration: '1 năm', price: 750000, description: 'Tiết kiệm nhất' },
      ],
    },
    {
      name: 'SuperGrok',
      slug: 'supergrok',
      category: 'AI',
      description: 'Grok AI phiên bản cao cấp từ xAI — trợ lý thông minh không kiểm duyệt, phân tích dữ liệu thời gian thực, hỗ trợ lập trình và nghiên cứu chuyên sâu.',
      priceFrom: 129000,
      badge: 'Mới nhất',
      icon: '⚡',
      isFeatured: true,
      plans: [
        { name: '1 tháng', duration: '1 tháng', price: 129000, description: 'Phù hợp dùng thử' },
        { name: '1 năm', duration: '1 năm', price: 1290000, description: 'Tiết kiệm nhất' },
      ],
    },
    {
      name: 'Gemini Pro',
      slug: 'gemini-pro',
      category: 'AI',
      description: 'Google Gemini Advanced — AI đa phương tiện của Google, hỗ trợ phân tích hình ảnh, viết code, tổng hợp tài liệu dài và tích hợp toàn bộ hệ sinh thái Google.',
      priceFrom: 89000,
      badge: 'Phổ biến',
      icon: '✨',
      isFeatured: true,
      plans: [
        { name: '1 tháng', duration: '1 tháng', price: 89000, description: 'Phù hợp dùng thử' },
        { name: '1 năm', duration: '1 năm', price: 890000, description: 'Tiết kiệm nhất' },
      ],
    },
    {
      name: 'Flow 3',
      slug: 'flow-3',
      category: 'Thiết kế',
      description: 'Công cụ tạo video AI thế hệ mới — chỉ nhập mô tả, AI tự tạo video chất lượng cao. Phù hợp làm content, quảng cáo, reel và video ngắn chuyên nghiệp.',
      priceFrom: 119000,
      badge: 'AI Video',
      icon: '🎥',
      isFeatured: true,
      plans: [
        { name: '1 tháng', duration: '1 tháng', price: 119000, description: 'Phù hợp dùng thử' },
        { name: '1 năm', duration: '1 năm', price: 1190000, description: 'Tiết kiệm nhất' },
      ],
    },
    {
      name: 'Microsoft 365',
      slug: 'microsoft-365',
      category: 'Văn phòng',
      description: 'Trọn bộ Word, Excel, PowerPoint, OneDrive 1TB cho học tập và công việc. Tích hợp AI Copilot, cập nhật liên tục, dùng trên mọi thiết bị.',
      priceFrom: 99000,
      badge: 'Văn phòng',
      icon: '💼',
      isFeatured: true,
      plans: [
        { name: '1 tháng', duration: '1 tháng', price: 99000, description: 'Phù hợp dùng thử' },
        { name: '1 năm', duration: '1 năm', price: 990000, description: 'Tiết kiệm nhất' },
      ],
    },
  ]

  for (const productData of products) {
    const { plans, ...product } = productData
    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: { ...product },
      create: { ...product },
    })

    for (const plan of plans) {
      const existing = await prisma.productPlan.findFirst({
        where: { productId: created.id, duration: plan.duration },
      })
      if (!existing) {
        await prisma.productPlan.create({
          data: { ...plan, productId: created.id },
        })
      }
    }
    console.log(`✅ Sản phẩm: ${product.name}`)
  }

  console.log('\n🎉 Seed hoàn tất!')
  console.log(`📧 Admin email: ${adminEmail}`)
  console.log(`🔑 Admin password: ${adminPassword}`)
  console.log('🌐 Truy cập admin tại: http://localhost:3000/admin/login')
}

main()
  .catch((e) => {
    console.error('❌ Seed lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
