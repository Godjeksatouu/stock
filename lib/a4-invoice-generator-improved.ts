import jsPDF from 'jspdf'
import { formatPrice } from './currency'

export interface A4InvoiceItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface A4InvoiceData {
  invoiceNumber: string
  date: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  items: A4InvoiceItem[]
  subtotal: number
  discount?: number
  tax?: number
  total: number
  amountPaid?: number
  change?: number
  paymentMethod?: string
  notes?: string
  stockId: string
  stockName?: string
  factureBarcode?: string
  barcodes?: string
}

export function generateImprovedA4InvoicePDF(data: A4InvoiceData) {
  const pdf = new jsPDF('p', 'mm', 'a4')

  const safe = (v: any) => (v === undefined || v === null ? '' : String(v))
  const line = (y: number, color = [220, 230, 242]) => {
    pdf.setDrawColor(color[0], color[1], color[2])
    pdf.line(15, y, 195, y)
  }

  // Header
  pdf.setFillColor(41, 128, 185)
  pdf.rect(0, 0, 210, 30, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(18)
  pdf.text('FACTURE', 15, 20)

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.text(`N°: ${safe(data.invoiceNumber)}`, 120, 12)
  pdf.text(`Date: ${safe(data.date)}`, 120, 18)

  // Seller/Customer info
  pdf.setTextColor(33, 33, 33)
  pdf.setFontSize(12)
  pdf.text('Client', 15, 42)
  pdf.setFontSize(10)
  pdf.text(`${safe(data.customerName)}`, 15, 48)
  if (data.customerPhone) pdf.text(`${safe(data.customerPhone)}`, 15, 54)
  if (data.customerAddress) pdf.text(`${safe(data.customerAddress)}`, 15, 60)

  // Stock info
  if (data.stockName) {
    pdf.setFontSize(12)
    pdf.text('Stock', 120, 42)
    pdf.setFontSize(10)
    pdf.text(`${safe(data.stockName)}`, 120, 48)
  }

  // Items header
  let y = 70
  pdf.setFontSize(11)
  pdf.setTextColor(41, 128, 185)
  pdf.text('Désignation', 15, y)
  pdf.text('Qté', 120, y)
  pdf.text('PU', 140, y)
  pdf.text('Total', 175, y)
  line(y + 2)

  // Items rows
  pdf.setTextColor(33, 33, 33)
  pdf.setFontSize(10)
  y += 8
  const addLine = (text: string, x: number) => pdf.text(text, x, y)
  data.items.forEach((it) => {
    addLine(String(it.product_name).slice(0, 60), 15)
    addLine(String(it.quantity), 120)
    addLine(formatPrice(Number(it.unit_price)), 140)
    addLine(formatPrice(Number(it.total_price)), 175)
    y += 7
    if (y > 250) {
      pdf.addPage()
      y = 20
    }
  })

  // Totals box
  y += 6
  if (y < 210) y = Math.max(y, 180)
  pdf.setFontSize(11)
  pdf.setTextColor(41, 128, 185)
  pdf.text('Récapitulatif', 15, y)
  line(y + 2)
  y += 8

  pdf.setTextColor(33, 33, 33)
  const row = (label: string, value: string) => {
    pdf.text(label, 120, y)
    pdf.text(value, 175, y, { align: 'right' })
    y += 6
  }
  row('Sous-total', formatPrice(Number(data.subtotal || 0)))
  if (data.discount && Number(data.discount) > 0) row('Remise', '-' + formatPrice(Number(data.discount)))
  if (data.tax && Number(data.tax) > 0) row('Taxe', formatPrice(Number(data.tax)))
  row('Total', formatPrice(Number(data.total || data.subtotal || 0)))
  if (data.amountPaid !== undefined) row('Payé', formatPrice(Number(data.amountPaid)))
  const remaining = Number(data.total || 0) - Number(data.amountPaid || 0)
  if (!isNaN(remaining)) row('Reste', formatPrice(Math.max(0, remaining)))
  if (data.change !== undefined) row('Monnaie', formatPrice(Number(data.change)))
  if (data.paymentMethod) row('Paiement', safe(data.paymentMethod))
  // Payment status
  const status = ((): string => {
    const paid = Number(data.amountPaid || 0)
    const total = Number(data.total || 0)
    if (paid >= total) return 'paid'
    if (paid > 0) return 'partial'
    return 'unpaid'
  })()
  row('Statut du paiement', status)

  // Notes
  if (data.notes) {
    y += 4
    const notes = safe(data.notes)
    pdf.setFontSize(10)
    const lines = pdf.splitTextToSize(notes, 180)
    pdf.text(lines, 15, y)
    y += 6 + lines.length * 5
  }

  // Footer with facture barcode text (image can be added later)
  const pageH = pdf.internal.pageSize.getHeight()
  pdf.setFontSize(8)
  pdf.setTextColor(120, 120, 120)
  pdf.text('Document généré automatiquement', 15, pageH - 16)

  if (data.factureBarcode) {
    pdf.setFontSize(10)
    pdf.setTextColor(33,33,33)
    pdf.text(`Code-barres facture: ${safe(data.factureBarcode)}`, 15, pageH - 8)
  }

  return pdf
}

