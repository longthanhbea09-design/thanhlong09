'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProductSection from '@/components/ProductSection'
import HowToBuy from '@/components/HowToBuy'
import WarrantySection from '@/components/WarrantySection'
import ContactSection from '@/components/ContactSection'
import Footer from '@/components/Footer'
import FloatingSupport from '@/components/FloatingSupport'
import ProductCheckoutModal from '@/components/ProductCheckoutModal'
import type { Product, Setting } from '@/types'

export default function HomeClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Setting | null>(null)
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetch('/api/products', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setSettings)
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen bg-[#050816]">
      <Header />
      <Hero />
      <ProductSection products={products} onBuyNow={setCheckoutProduct} />
      <HowToBuy />
      <WarrantySection />
      <ContactSection settings={settings} />
      <Footer settings={settings} />
      <FloatingSupport settings={settings} />

      {checkoutProduct && (
        <ProductCheckoutModal
          product={checkoutProduct}
          settings={settings}
          onClose={() => setCheckoutProduct(null)}
        />
      )}
    </div>
  )
}
