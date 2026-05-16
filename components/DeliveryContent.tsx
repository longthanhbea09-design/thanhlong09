'use client'

interface Props {
  content: string
  className?: string
}

export default function DeliveryContent({ content, className }: Props) {
  // Split on URLs so they can be rendered as clickable <a> tags
  const parts = content.split(/(https?:\/\/[^\s\n]+)/)

  return (
    <pre className={className}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline hover:text-cyan-300 break-all"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </pre>
  )
}
