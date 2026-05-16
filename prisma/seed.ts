import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function buildVariants(priceFrom: number, yearPrice: number) {
  return [
    {
      name: '1 tháng KBH',
      duration: '1 tháng',
      type: 'kbh',
      price: priceFrom,
      description: 'Không bảo hành',
      available: true,
      sortOrder: 0,
    },
    {
      name: '1 tháng dùng chung',
      duration: '1 tháng',
      type: 'bhf-shared',
      price: priceFrom + 20000,
      description: 'Bảo hành Full, tài khoản dùng chung',
      available: true,
      sortOrder: 1,
    },
    {
      name: '1 tháng chính chủ',
      duration: '1 tháng',
      type: 'bhf-own',
      price: priceFrom + 50000,
      description: 'Bảo hành Full, tài khoản riêng',
      available: true,
      sortOrder: 2,
    },
    {
      name: '1 năm',
      duration: '1 năm',
      type: 'yearly',
      price: yearPrice,
      description: 'Tiết kiệm nhất, bảo hành cả năm',
      available: false,
      sortOrder: 3,
    },
  ]
}

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...')

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@longshop.net'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash, role: 'admin' },
  })
  console.log(`✅ Admin: ${adminEmail}`)

  // Settings — id mặc định là "singleton" (MongoDB cho phép string _id)
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
  console.log('✅ Settings')

  // Xóa sản phẩm không còn bán
  const slugsToRemove = ['canva-pro', 'youtube-premium', 'netflix', 'grammarly-premium', 'duolingo-super']
  for (const slug of slugsToRemove) {
    const product = await prisma.product.findUnique({ where: { slug } })
    if (product) {
      const hasOrders = await prisma.order.findFirst({ where: { productId: product.id } })
      if (hasOrders) {
        await prisma.product.update({ where: { slug }, data: { isActive: false } })
        console.log(`⏸️ Ẩn: ${slug}`)
      } else {
        await prisma.productPlan.deleteMany({ where: { productId: product.id } })
        await prisma.product.delete({ where: { slug } })
        console.log(`🗑️ Xóa: ${slug}`)
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
      yearPrice: 990000,
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
      yearPrice: 750000,
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
      yearPrice: 1290000,
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
      yearPrice: 890000,
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
      yearPrice: 1190000,
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
      yearPrice: 990000,
    },
  ]

  for (const { yearPrice, ...productData } of products) {
    const created = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: { ...productData },
      create: { ...productData },
    })

    // Chỉ seed variant mặc định nếu sản phẩm chưa có variant nào
    const existingCount = await prisma.productPlan.count({ where: { productId: created.id } })
    if (existingCount === 0) {
      const variants = buildVariants(productData.priceFrom, yearPrice)
      // Dùng vòng lặp create thay vì createMany để tương thích tốt nhất với MongoDB
      for (const v of variants) {
        await prisma.productPlan.create({
          data: { ...v, productId: created.id, isActive: true },
        })
      }
      console.log(`✅ ${productData.name} (${variants.length} options mới)`)
    } else {
      console.log(`✅ ${productData.name} (giữ nguyên ${existingCount} options hiện có)`)
    }
  }

  console.log('\n🎉 Seed hoàn tất!')
  console.log(`📧 Admin: ${adminEmail} / ${adminPassword}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
