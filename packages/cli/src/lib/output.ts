export interface OutputOptions {
  json?: boolean
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

export function printTable(
  rows: object[],
  columns: { key: string; header: string; width?: number }[]
): void {
  if (rows.length === 0) {
    console.log('No results found.')
    return
  }

  const getField = (row: object, key: string): string =>
    String((row as Record<string, unknown>)[key] ?? '')

  // Calculate column widths
  const widths = columns.map((col) => {
    const maxDataWidth = Math.max(...rows.map((row) => getField(row, col.key).length))
    return col.width ?? Math.max(col.header.length, maxDataWidth)
  })

  // Header
  const header = columns.map((col, i) => col.header.padEnd(widths[i])).join('  ')
  console.log(header)
  console.log(widths.map((w) => '─'.repeat(w)).join('──'))

  // Rows
  for (const row of rows) {
    const line = columns.map((col, i) => getField(row, col.key).padEnd(widths[i])).join('  ')
    console.log(line)
  }
}

export function printSingle(data: object, fields: { key: string; label: string }[]): void {
  const record = data as Record<string, unknown>
  const maxLabel = Math.max(...fields.map((f) => f.label.length))
  for (const field of fields) {
    const value = record[field.key] ?? '—'
    console.log(`${field.label.padEnd(maxLabel)}  ${value}`)
  }
}
