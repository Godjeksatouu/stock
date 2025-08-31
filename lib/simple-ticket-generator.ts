import { formatPrice } from './currency'

// Configuration des informations de stock
export function getStockInfo(stockId: string) {
  const stockConfigs = {
    'al-ouloum': {
      name: 'Librairie al ouloum',
      phone: '+212 64-0040031 / ‎+212 80-8527653',
      address: '26 rue el oued, quartier Moulay Youssef, Ben Ahmed',
      email: 'Librairie.rafik@gmail.com'
    },
    'renaissance': {
      name: 'Librairie et papeterie la renaissance',
      phone: '05 23 40 87 68 / 06 99 94 44 10',
      address: '03 rue ibn zydoun, Hay PAM, Ben Ahmed',
      email: 'larennaissancepap@gmail.com'
    },
    'gros': {
      name: 'Dépôt al massira',
      phone: '06 61 67 10 11',
      address: 'Quartier Moulay Youssef, Derb Si Lahcen, Ben Ahmed',
      email: null
    }
  }

  return stockConfigs[stockId as keyof typeof stockConfigs] || stockConfigs['al-ouloum']
}

// Fonction pour générer un code-barres basé sur l'ID de vente
export function generateBarcodeForSale(saleId: number): string {
  const timestamp = Date.now().toString().slice(-6)
  const paddedSaleId = String(saleId).padStart(4, '0')
  return `${paddedSaleId}${timestamp}`
}

// Interface pour les données du ticket
export interface SimpleTicketData {
  id: number
  invoiceNumber: string
  date: string
  stockId: string
  customerName?: string
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total: number
  }>
  subtotal: number
  total: number
  payment_method?: string
  amount_paid?: number
  change?: number
  barcode?: string
  notes?: string
  // Optional retour/exchange section appended after totals
  returnInfo?: {
    status: 'Retour partiel' | 'Retour total'
    refund_amount: number
    refund_method?: string
    items: Array<{
      product_name: string
      quantity: number
      unit_price: number
      total: number
      type: 'return' | 'exchange'
    }>
  }
}

// Générer le HTML du ticket simple et stable
export function generateSimpleTicketHTML(data: SimpleTicketData): string {
  const stockInfo = getStockInfo(data.stockId)
  const barcode = data.barcode || generateBarcodeForSale(data.id)

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket - ${data.invoiceNumber}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            width: 80mm;
            padding: 5mm;
            background: white;
            color: black;
        }

        .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
        }

        .store-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 3px;
        }

        .store-info {
            font-size: 10px;
            line-height: 1.2;
        }

        .invoice-info {
            margin: 10px 0;
            font-size: 11px;
        }

        .invoice-info div {
            margin-bottom: 2px;
        }

        .items-section {
            margin: 10px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 8px 0;
        }

        .item {
            margin-bottom: 5px;
            font-size: 11px;
        }

        .item-name {
            font-weight: bold;
            margin-bottom: 1px;
        }

        .item-details {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
        }

        .totals {
            margin: 10px 0;
            font-size: 11px;
        }

        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .final-total {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 5px;
        }
        .returns-section {
            margin: 10px 0;
            padding: 8px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
        }
        .returns-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 6px;
        }
        .return-item { margin-bottom: 5px; font-size: 11px; }
        .return-item-details { display: flex; justify-content: space-between; font-size: 10px; }
        .return-summary { margin-top: 6px; font-size: 11px; }
        .return-status { font-weight: bold; }


        .payment-info {
            margin: 10px 0;
            font-size: 11px;
            border-top: 1px dashed #000;
            padding-top: 8px;
        }

        .barcode-section {
            text-align: center;
            margin: 10px 0;
            border-top: 1px dashed #000;
            padding-top: 8px;
        }

        .barcode {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 5px 0;
        }

        .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 8px;
        }

        @media print {
            body {
                width: 80mm;
            }
        }
    </style>
</head>
<body>
    <!-- En-tête -->
    <div class="header">
        <div class="store-name">${stockInfo.name}</div>
        <div class="store-info">
            ${stockInfo.address}<br>
            Tél: ${stockInfo.phone}
            ${stockInfo.email ? `<br>Email: ${stockInfo.email}` : ''}
        </div>
    </div>

    <!-- Informations de la facture -->
    <div class="invoice-info">
        <div><strong>Facture N°:</strong> ${data.invoiceNumber}</div>
        <div><strong>Date:</strong> ${data.date}</div>
        ${data.customerName ? `<div><strong>Client:</strong> ${data.customerName}</div>` : ''}
    </div>

    <!-- Articles -->
    <div class="items-section">
        ${data.items.map((item, index) => `
        <div class="item">
            <div class="item-name">${index + 1}. ${item.product_name}</div>
            <div class="item-details">
                <span>${item.quantity} × ${formatPrice(item.unit_price)}</span>
                <span>${formatPrice(item.total)}</span>
            </div>
        </div>
        `).join('')}
    </div>

    <!-- Totaux -->
    <div class="totals">
        ${data.subtotal !== data.total ? `
        <div class="total-line">
            <span>Sous-total:</span>
            <span>${formatPrice(data.subtotal)}</span>
        </div>
        ` : ''}

        <div class="total-line final-total">
            <span>TOTAL:</span>
            <span>${formatPrice(data.total)}</span>
        </div>
    </div>

    ${data.returnInfo ? `
    <!-- Retour / Échange -->
    <div class="returns-section">
      <div class="returns-title">Retour / Échange</div>
      ${data.returnInfo.items.map(it => `
        <div class="return-item">
          <div class="item-name">${it.product_name}</div>
          <div class="return-item-details">
            <span>${it.type === 'exchange' ? 'Échange' : 'Retour'} - ${it.quantity} × ${formatPrice(it.unit_price)}</span>
            <span>${formatPrice(it.total)}</span>
          </div>
        </div>
      `).join('')}
      <div class="return-summary">
        <div class="total-line"><span>Remboursement:</span> <span>${formatPrice(data.returnInfo.refund_amount)}</span></div>
        ${data.returnInfo.refund_method ? `<div class=\"total-line\"><span>Méthode:</span> <span>${data.returnInfo.refund_method}</span></div>` : ''}
        <div class="total-line return-status"><span>Statut:</span> <span>${data.returnInfo.status}</span></div>
      </div>
    </div>
    ` : ''}

    <!-- Informations de paiement -->
    ${data.payment_method || data.amount_paid ? `
    <div class="payment-info">
        ${data.payment_method ? `<div><strong>Paiement:</strong> ${data.payment_method === 'cash' ? 'Espèces' : data.payment_method}</div>` : ''}
        ${data.amount_paid ? `<div><strong>Montant payé:</strong> ${formatPrice(data.amount_paid)}</div>` : ''}
        ${data.change && data.change > 0 ? `<div><strong>Monnaie:</strong> ${formatPrice(data.change)}</div>` : ''}
    </div>
    ` : ''}

    <!-- Code-barres -->
    <div class="barcode-section">
        <div>Code-barres:</div>
        <div class="barcode">${barcode}</div>
    </div>

    <!-- Notes -->
    ${data.notes ? `
    <div class="footer">
        <div><strong>Notes:</strong></div>
        <div>${data.notes}</div>
    </div>
    ` : ''}

    <!-- Pied de page -->
    <div class="footer">
        <div>Merci pour votre visite!</div>
        <div>Conservez ce ticket</div>
    </div>
</body>
</html>
  `
}

// Télécharger le ticket
export function downloadSimpleTicket(data: SimpleTicketData) {
  const html = generateSimpleTicketHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `ticket_${data.invoiceNumber}.html`
  a.style.display = 'none'

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Imprimer le ticket
export function printSimpleTicket(data: SimpleTicketData) {
  const html = generateSimpleTicketHTML(data)
  const printWindow = window.open('', '_blank')

  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }
}
