import { cn } from '@/lib/utils'

type NexoraMarkProps = {
  className?: string
  size?: number
  title?: string
}

export function NexoraMark({ className, size = 36, title = 'Nexora' }: NexoraMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="nexora-mark-bg" x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1c2e32" />
          <stop offset="1" stopColor="#0d1416" />
        </linearGradient>
        <linearGradient id="nexora-mark-stroke" x1="18" y1="14" x2="46" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8ef0c4" />
          <stop offset=".42" stopColor="#52c98a" />
          <stop offset="1" stopColor="#0d7a5f" />
        </linearGradient>
        <radialGradient
          id="nexora-mark-node"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(44 18) rotate(90) scale(10)"
        >
          <stop stopColor="#b8ffd9" />
          <stop offset="1" stopColor="#52c98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#nexora-mark-bg)" />
      <rect width="64" height="64" rx="15" fill="url(#nexora-mark-stroke)" fillOpacity=".07" />
      <rect x="1" y="1" width="62" height="62" rx="14" stroke="#52c98a" strokeOpacity=".2" />
      <circle cx="44" cy="18" r="9" fill="url(#nexora-mark-node)" opacity=".85" />
      <path
        d="M21 46V18h4.8L38.5 40.2V18H44v28"
        stroke="url(#nexora-mark-stroke)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="18" r="3.25" fill="#8ef0c4" />
      <circle cx="44" cy="18" r="1.35" fill="#0a1410" fillOpacity=".35" />
    </svg>
  )
}
