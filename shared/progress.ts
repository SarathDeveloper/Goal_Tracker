export function milestoneProgress(done: number, total: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.round((done / total) * 100)
}

export function numericProgress(start: number, target: number, current: number | null): number {
  if (current === null || !Number.isFinite(current) || !Number.isFinite(start) || !Number.isFinite(target)) {
    return 0
  }
  const span = target - start
  if (span === 0) {
    return current === target ? 100 : 0
  }
  const raw = ((current - start) / span) * 100
  return Math.round(Math.min(100, Math.max(0, raw)))
}
