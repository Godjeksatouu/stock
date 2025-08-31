import { formatPrice } from './currency'

export interface InvoiceData {
  id: number
  invoiceNumber: string
  date: string
  client?: {
    name: string
    address?: string
    phone?: string
  }
  seller?: {
    name: string
  }
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total: number
  }>
  subtotal: number
  total: number
  payment_method: string
  payment_status: string
  amount_paid?: number
  amount_remaining?: number
  notes?: string
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture ${data.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        .company-details {
            color: #6b7280;
            line-height: 1.5;
        }
        .invoice-info {
            text-align: right;
            flex: 1;
        }
        .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .invoice-number {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .invoice-date {
            font-size: 14px;
            color: #6b7280;
        }
        .client-section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .client-info {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .totals-section {
            margin-top: 30px;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
        }
        .totals-table {
            width: 100%;
            max-width: 400px;
            margin-left: auto;
        }
        .totals-table td {
            padding: 8px 12px;
            border: none;
        }
        .total-row {
            font-size: 18px;
            font-weight: bold;
            background-color: #2563eb;
            color: white;
        }
        .payment-info {
            margin-top: 30px;
            padding: 20px;
            background-color: #f0f9ff;
            border-radius: 6px;
            border: 1px solid #bfdbfe;
        }
        .payment-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-paid {
            background-color: #dcfce7;
            color: #166534;
        }
        .status-partial {
            background-color: #fef3c7;
            color: #92400e;
        }
        .status-pending {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .notes {
            margin-top: 30px;
            padding: 15px;
            background-color: #fffbeb;
            border-radius: 6px;
            border-left: 4px solid #f59e0b;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <div class="company-name">Librairie La Renaissance</div>
                <div class="company-details">
                    Système de Gestion de Stock<br>
                    Gestion des Ventes et Achats
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-title">FACTURE</div>
                <div class="invoice-number">N° ${data.invoiceNumber}</div>
                <div class="invoice-date">Émise le ${currentDate}</div>
            </div>
        </div>

        ${data.client ? `
        <div class="client-section">
            <div class="section-title">Facturé à</div>
            <div class="client-info">
                <strong>${data.client.name}</strong><br>
                ${data.client.address || ''}<br>
                ${data.client.phone || ''}
            </div>
        </div>
        ` : `
        <div class="client-section">
            <div class="section-title">Type de vente</div>
            <div class="client-info">
                <strong>Vente directe (sans client)</strong>
            </div>
        </div>
        `}

        <div class="section-title">Détail des articles</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Produit</th>
                    <th class="text-center">Quantité</th>
                    <th class="text-right">Prix unitaire</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatPrice(item.unit_price)}</td>
                    <td class="text-right">${formatPrice(item.total)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Sous-total:</td>
                    <td class="text-right">${formatPrice(data.subtotal)}</td>
                </tr>
                <tr class="total-row">
                    <td>TOTAL:</td>
                    <td class="text-right">${formatPrice(data.total)}</td>
                </tr>
                ${data.amount_paid !== undefined ? `
                <tr style="background-color: #ecfdf5; font-weight: 600; color: #059669;">
                    <td>💰 Montant payé (DH):</td>
                    <td class="text-right">${formatPrice(data.amount_paid)}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        <div class="payment-info">
            <div class="section-title">Informations de paiement</div>
            <p><strong>Mode de paiement:</strong> ${getPaymentMethodLabel(data.payment_method)}</p>
            <p><strong>Statut:</strong> 
                <span class="payment-status ${getStatusClass(data.payment_status)}">
                    ${getPaymentStatusLabel(data.payment_status)}
                </span>
            </p>
            ${data.payment_status === 'partial' ? `
            <p><strong>Montant payé:</strong> ${formatPrice(data.amount_paid || 0)}</p>
            <p><strong>Montant restant:</strong> ${formatPrice(data.amount_remaining || 0)}</p>
            ` : ''}
        </div>

        ${data.notes ? `
        <div class="notes">
            <div class="section-title">Notes</div>
            <p>${data.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
            Facture générée automatiquement le ${currentDate}<br>
            ${data.seller ? `Vendeur: ${data.seller.name}` : ''}
        </div>
    </div>
</body>
</html>
  `
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    'cash': 'Espèces',
    'card': 'Carte bancaire',
    'check': 'Chèque',
    'credit': 'Crédit'
  }
  return labels[method] || method
}

function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'paid': 'Payé',
    'partial': 'Paiement partiel',
    'pending': 'En attente'
  }
  return labels[status] || status
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    'paid': 'status-paid',
    'partial': 'status-partial',
    'pending': 'status-pending'
  }
  return classes[status] || 'status-pending'
}

export function downloadInvoiceHTML(data: InvoiceData) {
  const html = generateInvoiceHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `facture-vente-${data.id}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function printInvoice(data: InvoiceData) {
  const html = generateInvoiceHTML(data)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}

export function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const time = String(now.getTime()).slice(-6) // Last 6 digits of timestamp

  return `FAC-${year}${month}${day}-${time}`
}
