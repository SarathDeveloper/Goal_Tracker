export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCell(cell)).join(','))
  return `${lines.join('\r\n')}\r\n`
}
