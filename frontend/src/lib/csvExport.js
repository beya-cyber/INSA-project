/**
 * Minimal, dependency-free CSV export. Escapes per RFC 4180: any field
 * containing a comma, quote, or newline is wrapped in quotes with
 * internal quotes doubled. Good enough for exporting case lists for
 * offline review or handoff to a partner agency - not intended as a
 * general-purpose CSV library.
 */
function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCsv(filename, rows, columns) {
  const header = columns.map((c) => escapeCsvField(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escapeCsvField(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','))
    .join('\n')
  const csvContent = `${header}\n${body}`

  // Prefix with a UTF-8 BOM so Excel (still the most common tool this
  // ends up opened in) renders Amharic victim names correctly instead
  // of mojibake - a real, specific concern for this dataset.
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
