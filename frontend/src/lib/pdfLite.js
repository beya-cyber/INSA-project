// src/lib/pdfLite.js
// Tiny dependency-free PDF writer (text only, Courier / Helvetica-Bold, A4).
// Enough for certified compliance reports and restitution receipts without
// pulling a PDF library into the bundle.

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 44
const LINE = 12

const esc = (s) =>
  String(s)
    .replace(/[^\x20-\x7E]/g, '?') // standard fonts are WinAnsi-only
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

// lines: array of strings or { text, bold, size }
export function buildPdf(title, lines) {
  const maxChars = 92
  const wrapped = []
  for (const l of lines) {
    const item = typeof l === 'string' ? { text: l } : l
    const text = item.text ?? ''
    if (item.bold || text.length <= maxChars) wrapped.push(item)
    else for (let i = 0; i < text.length; i += maxChars) wrapped.push({ ...item, text: text.slice(i, i + maxChars) })
  }

  const perPage = Math.floor((PAGE_H - MARGIN * 2) / LINE)
  const pages = []
  for (let i = 0; i < wrapped.length; i += perPage) pages.push(wrapped.slice(i, i + perPage))
  if (!pages.length) pages.push([{ text: '' }])

  const objs = []
  const add = (body) => { objs.push(body); return objs.length }

  const catalog = add('') // 1, filled later
  const pagesRoot = add('') // 2
  const fontMono = add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>') // 3
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>') // 4

  const pageIds = []
  pages.forEach((pg, pi) => {
    let y = PAGE_H - MARGIN
    let stream = ''
    pg.forEach((ln) => {
      const font = ln.bold ? '/F2' : '/F1'
      const size = ln.size || (ln.bold ? 11 : 9)
      stream += `BT ${font} ${size} Tf ${MARGIN} ${y} Td (${esc(ln.text)}) Tj ET\n`
      y -= LINE
    })
    stream += `BT /F1 7 Tf ${MARGIN} 24 Td (${esc(title)} - page ${pi + 1}/${pages.length}) Tj ET\n`
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)
    const page = add(
      `<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontMono} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`
    )
    pageIds.push(page)
  })

  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`
  objs[pagesRoot - 1] = `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n` })
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([out], { type: 'application/pdf' })
}
