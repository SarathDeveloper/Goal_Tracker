export function BarChart({
  items,
  label,
}: {
  items: { label: string; value: number }[]
  label: string
}) {
  const max = Math.max(1, ...items.map((item) => item.value))
  const width = 640
  const height = 180
  const slot = width / Math.max(items.length, 1)
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <title>{label}</title>
      {items.map((item, index) => {
        const barHeight = (item.value / max) * 120
        const x = index * slot + 16
        const y = 130 - barHeight
        return (
          <g key={item.label}>
            <rect x={x} y={y} width={Math.max(slot - 28, 8)} height={barHeight} rx="6" fill="#0f6e6b" />
            <text x={x} y={150}>
              {item.label}
            </text>
            <text x={x} y={y - 6}>
              {item.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
