interface ProductLogoProps {
  slug: string
  size?: number
}

export default function ProductLogo({ slug, size = 48 }: ProductLogoProps) {
  const logos: Record<string, JSX.Element> = {

    'chatgpt-plus': (
      <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="41" height="41" rx="10" fill="#10A37F"/>
        <path
          d="M37.532 16.87a9.963 9.963 0 00-.856-8.184 10.078 10.078 0 00-10.855-4.835 9.964 9.964 0 00-7.504-3.36 10.079 10.079 0 00-9.612 6.977 9.967 9.967 0 00-6.664 4.834 10.08 10.08 0 001.24 11.817 9.965 9.965 0 00.856 8.185 10.079 10.079 0 0010.855 4.835 9.965 9.965 0 007.504 3.36 10.078 10.078 0 009.617-6.981 9.967 9.967 0 006.663-4.834 10.079 10.079 0 00-1.243-11.813zM22.498 37.886a7.474 7.474 0 01-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 00.655-1.134V19.054l3.366 1.944a.12.12 0 01.066.092v9.299a7.505 7.505 0 01-7.49 7.496zM6.392 31.006a7.471 7.471 0 01-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 001.308 0l9.724-5.614v3.888a.12.12 0 01-.048.103l-8.051 4.649a7.504 7.504 0 01-10.24-2.744zM4.297 13.62A7.469 7.469 0 018.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 00.654 1.132l9.723 5.614-3.366 1.944a.12.12 0 01-.114.012L7.044 23.86a7.504 7.504 0 01-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 01.114-.012l8.048 4.648a7.498 7.498 0 01-1.158 13.528v-9.476a1.293 1.293 0 00-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 00-1.308 0l-9.723 5.614v-3.888a.12.12 0 01.048-.103l8.05-4.645a7.497 7.497 0 0111.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 01-.065-.092v-9.299a7.497 7.497 0 0112.293-5.756 6.94 6.94 0 00-.236.134l-7.965 4.6a1.294 1.294 0 00-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z"
          fill="white"
          transform="scale(0.78) translate(4.5, 4.5)"
        />
      </svg>
    ),

    'capcut-pro': (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl overflow-hidden bg-white flex items-center justify-center"
      >
        <img
          src="/logos/capcut.jpg"
          alt="CapCut"
          style={{ width: size * 0.82, height: size * 0.82, objectFit: 'contain' }}
        />
      </div>
    ),

    'supergrok': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="10" fill="#000000"/>
        <g transform="translate(12, 12)">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
        </g>
      </svg>
    ),

    'gemini-pro': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gem-g" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6"/>
            <stop offset="100%" stopColor="#818CF8"/>
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="10" fill="white"/>
        <path
          d="M24 4C24 24 24 24 4 24C24 24 24 24 24 44C24 24 24 24 44 24C24 24 24 24 24 4Z"
          fill="url(#gem-g)"
        />
      </svg>
    ),

    'flow-3': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="10" fill="#111111"/>
        <path d="M8 19C13 13 19 13 24 19C29 25 35 25 40 19" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M8 27C13 21 19 21 24 27C29 33 35 33 40 27" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
      </svg>
    ),

    'microsoft-365': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="10" fill="#F3F3F3"/>
        {/* Microsoft 4-square logo */}
        <rect x="9"  y="9"  width="13" height="13" fill="#F25022"/>
        <rect x="26" y="9"  width="13" height="13" fill="#7FBA00"/>
        <rect x="9"  y="26" width="13" height="13" fill="#00A4EF"/>
        <rect x="26" y="26" width="13" height="13" fill="#FFB900"/>
      </svg>
    ),
  }

  const logo = logos[slug]

  if (!logo) {
    // Fallback: colored initial circle
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center"
      >
        <span className="text-white font-bold text-lg">
          {slug.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return <div className="shrink-0">{logo}</div>
}
