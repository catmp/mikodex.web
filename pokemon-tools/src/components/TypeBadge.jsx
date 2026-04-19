import { TYPE_COLORS } from '../constants/types'

const SIZE = {
  xs: 'text-[10px] px-1.5 py-px',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
}

export default function TypeBadge({ type, size = 'sm' }) {
  const { bg, text } = TYPE_COLORS[type] ?? { bg: '#888', text: '#fff' }
  return (
    <span
      className={`inline-block rounded font-semibold uppercase tracking-wider ${SIZE[size]}`}
      style={{ backgroundColor: bg, color: text }}
      aria-label={`${type} type`}
    >
      {type}
    </span>
  )
}
