export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="bar" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={`${clamped}% complete`}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  )
}
