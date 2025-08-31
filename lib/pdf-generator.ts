import jsPDF from 'jspdf'
import { formatPrice } from './currency'

interface MovementInvoiceData {
  movement_number: string
  created_at: string
  from_stock_name: string
  to_stock_name: string
  recipient_name: string
  total_amount: number
  notes?: string
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
}

export const generateMovementInvoice = (data: MovementInvoiceData) => {
  const pdf = new jsPDF()

  // Helpers to ensure jsPDF.text always gets a string
  const safeStr = (v: any): string => (v === undefined || v === null) ? '' : String(v)
  const safeDate = (v: any): string => {
    const d = new Date(v)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
  }

  // Set font
  pdf.setFont('helvetica')

  // Header
  pdf.setFontSize(20)
  pdf.setTextColor(40, 40, 40)
  pdf.text('FACTURE DE MOUVEMENT DE STOCK', 20, 30)

  // Movement details
  pdf.setFontSize(12)
  pdf.setTextColor(80, 80, 80)

  // Left column
  pdf.text('Numéro de Mouvement:', 20, 50)
  pdf.setTextColor(40, 40, 40)
  pdf.text(safeStr(data.movement_number), 20, 60)

  pdf.setTextColor(80, 80, 80)
  pdf.text('Date:', 20, 75)
  pdf.setTextColor(40, 40, 40)
  pdf.text(safeDate(data.created_at), 20, 85)

  // Right column
  pdf.setTextColor(80, 80, 80)
  pdf.text('De:', 120, 50)
  pdf.setTextColor(40, 40, 40)
  pdf.text(safeStr(data.from_stock_name), 120, 60)

  pdf.setTextColor(80, 80, 80)
  pdf.text('Vers:', 120, 75)
  pdf.setTextColor(40, 40, 40)
  pdf.text(safeStr(data.to_stock_name), 120, 85)

  pdf.setTextColor(80, 80, 80)
  pdf.text('Responsable:', 120, 100)
  pdf.setTextColor(40, 40, 40)
  pdf.text(safeStr(data.recipient_name), 120, 110)

  // Line separator
  pdf.setDrawColor(200, 200, 200)
  pdf.line(20, 125, 190, 125)

  // Table header
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.setFillColor(70, 130, 180)
  pdf.rect(20, 135, 170, 10, 'F')

  pdf.text('Produit', 25, 142)
  pdf.text('Qté', 110, 142)
  pdf.text('Prix Unit.', 130, 142)
  pdf.text('Total', 160, 142)

  // Table content
  let yPosition = 155
  pdf.setTextColor(40, 40, 40)
  pdf.setFillColor(245, 245, 245)

  data.items.forEach((item, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      pdf.rect(20, yPosition - 7, 170, 10, 'F')
    }

    // Truncate long product names
    const nameRaw = item?.product_name ?? ''
    const productName = nameRaw.length > 35
      ? nameRaw.substring(0, 32) + '...'
      : nameRaw

    pdf.text(safeStr(productName), 25, yPosition)
    pdf.text(safeStr(item?.quantity ?? ''), 110, yPosition)
    pdf.text(formatPrice(Number(item?.unit_price ?? 0)), 130, yPosition)
    pdf.text(formatPrice(Number(item?.total_price ?? 0)), 160, yPosition)

    yPosition += 12
  })

  // Total section
  yPosition += 10
  pdf.setDrawColor(200, 200, 200)
  pdf.line(20, yPosition, 190, yPosition)

  yPosition += 15
  pdf.setFontSize(12)
  pdf.setTextColor(40, 40, 40)
  pdf.text('TOTAL:', 130, yPosition)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(formatPrice(Number(data.total_amount ?? 0)), 160, yPosition)

  // Notes section
  if (data.notes) {
    yPosition += 25
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text('Notes:', 20, yPosition)

    // Split notes into multiple lines if needed
    const splitNotes = pdf.splitTextToSize(data.notes, 170)
    pdf.text(splitNotes, 20, yPosition + 10)
  }

  // Footer
  const pageHeight = pdf.internal.pageSize.height
  pdf.setFontSize(8)
  pdf.setTextColor(120, 120, 120)
  pdf.text('Document généré automatiquement le ' + new Date().toLocaleString('fr-FR'), 20, pageHeight - 20)

  return pdf
}

export const downloadMovementInvoice = (data: MovementInvoiceData) => {
  const pdf = generateMovementInvoice(data)
  const filename = `facture-mouvement-${data.movement_number}.pdf`
  pdf.save(filename)
}

export const printMovementInvoice = (data: MovementInvoiceData) => {
  const pdf = generateMovementInvoice(data)

  // Open in new window for printing
  const pdfBlob = pdf.output('blob')
  const url = URL.createObjectURL(pdfBlob)
  const printWindow = window.open(url, '_blank')

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

// Alternative: Generate printable HTML invoice
export const generatePrintableHTML = (data: MovementInvoiceData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture Mouvement ${data.movement_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin: 0; }
        .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .details div { flex: 1; }
        .details h3 { color: #666; margin: 0 0 10px 0; font-size: 14px; }
        .details p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4682b4; color: white; }
        tr:nth-child(even) { background-color: #f5f5f5; }
        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
        .notes { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #4682b4; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FACTURE DE MOUVEMENT DE STOCK</h1>
      </div>

      <div class="details">
        <div>
          <h3>Informations du Mouvement</h3>
          <p><strong>Numéro:</strong> ${data.movement_number}</p>
          <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleDateString('fr-FR')}</p>
        </div>
        <div>
          <h3>Expédition</h3>
          <p><strong>De:</strong> ${data.from_stock_name}</p>
          <p><strong>Vers:</strong> ${data.to_stock_name}</p>
          <p><strong>Responsable:</strong> ${data.recipient_name}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th>Quantité</th>
            <th>Prix Unitaire</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>${formatPrice(item.unit_price)}</td>
              <td>${formatPrice(item.total_price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total">
        TOTAL: ${formatPrice(data.total_amount)}
      </div>

      ${data.notes ? `
        <div class="notes">
          <h3>Notes</h3>
          <p>${data.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}
      </div>

      <script>
        // Auto-print when loaded
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `
}
