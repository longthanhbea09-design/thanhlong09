'use client'

import { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Stats from '@/components/Stats'
import ProductSection from '@/components/ProductSection'
import HowToBuy from '@/components/HowToBuy'
import PricingSection from '@/components/PricingSection'
import OrderForm from '@/components/OrderForm'
import PaymentSection from '@/components/PaymentSection'
import WarrantySection from '@/components/WarrantySection'
import ContactSection from '@/components/ContactSection'
import Footer from '@/components/Footer'
import FloatingSupport from '@/components/FloatingSupport'
import type { Product, Setting } from '@/types'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Setting | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const orderFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)

    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(console.error)
  }, [])

  const handleBuyNow = (product: Product) => {
    setSelectedProduct(product)
    setTimeout(() => {
      document.querySelector('#order-form')?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  return (
    <div className="min-h-screen bg-[#050816]">
      <Header />
      <Hero />
      <Stats />
      <ProductSection products={products} onBuyNow={handleBuyNow} />
      <HowToBuy />
      <PricingSection />
      <div ref={orderFormRef}>
        <OrderForm products={products} selectedProduct={selectedProduct} />
      </div>
      <PaymentSection settings={settings} />
      <WarrantySection />
      <ContactSection settings={settings} />
      <Footer settings={settings} />
      <FloatingSupport zalo={settings?.zalo} />
    </div>
  )
}
