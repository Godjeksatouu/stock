import { formatPrice } from './currency'

// Configuration des informations de stock pour les factures de retour
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
      email: null // Pas d'email spécifié pour le dépôt
    }
  }

  return stockConfigs[stockId as keyof typeof stockConfigs] || stockConfigs['al-ouloum']
}

export interface ReturnInvoiceData {
  id: number
  invoiceNumber: string
  date: string
  returnType: 'refund' | 'exchange'
  originalSaleId: number
  stockId: string // Ajout du stockId pour identifier le stock
  client?: {
    name: string
    address?: string
    phone?: string
  }
  seller?: {
    name: string
  }
  returnedItems: Array<{
    product_name: string
    product_reference?: string
    quantity: number
    unit_price: number
    total: number
    reason?: string
  }>
  exchangeItems?: Array<{
    product_name: string
    product_reference?: string
    quantity: number
    unit_price: number
    total: number
  }>
  totalRefundAmount: number
  totalExchangeAmount?: number
  balanceAdjustment?: number
  payment_method: string
  payment_status?: string
  amount_paid?: number
  amount_refunded?: number
  notes?: string
  barcode?: string // Code de vente unique pour le retour
}

export function generateReturnInvoiceHTML(data: ReturnInvoiceData): string {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const isRefund = data.returnType === 'refund'
  const title = 'FACTURE DE VENTE' // Titre uniforme comme demandé
  const subtitle = isRefund ? 'Facture de Remboursement' : 'Facture d\'Échange'
  const titleColor = isRefund ? '#dc2626' : '#2563eb'

  // Obtenir les informations du stock
  const stockInfo = getStockInfo(data.stockId || 'al-ouloum')

  // Générer un code-barres unique pour ce retour si pas fourni
  const returnBarcode = data.barcode || generateReturnBarcode(data.id, data.returnType)

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} ${data.invoiceNumber}</title>
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
            border-bottom: 3px solid ${titleColor};
            padding-bottom: 20px;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: ${titleColor};
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
            font-size: 28px;
            font-weight: bold;
            color: ${titleColor};
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
        .original-sale-ref {
            font-size: 14px;
            color: #6b7280;
            margin-top: 10px;
            padding: 8px;
            background-color: #f3f4f6;
            border-radius: 4px;
        }
        .client-info {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid ${titleColor};
        }
        .client-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
        }
        .client-details {
            color: #6b7280;
            line-height: 1.6;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #374151;
            margin: 30px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: ${titleColor};
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
        .summary {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
        }
        .summary-row.total {
            font-size: 18px;
            font-weight: bold;
            color: ${titleColor};
            border-top: 2px solid #e5e7eb;
            padding-top: 12px;
            margin-top: 12px;
        }
        .balance-positive {
            color: #dc2626;
            font-weight: bold;
        }
        .balance-negative {
            color: #059669;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        .notes {
            margin-top: 20px;
            padding: 15px;
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }
        .notes-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 5px;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${titleColor};
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        @media print {
            .print-button {
                display: none;
            }
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
    <button class="print-button" onclick="window.print()">Imprimer</button>
    
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <div class="company-name">${stockInfo.name.toUpperCase()}</div>
                <div class="company-details">
                    📞 ${stockInfo.phone}<br>
                    📍 ${stockInfo.address}
                    ${stockInfo.email ? `<br>📧 ${stockInfo.email}` : ''}
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-title">${title}</div>
                <div class="invoice-subtitle" style="font-size: 18px; color: ${titleColor}; margin-bottom: 10px;">${subtitle}</div>
                <div class="invoice-number">N° ${data.invoiceNumber}</div>
                <div class="invoice-date">${currentDate}</div>
                <div class="original-sale-ref">
                    <strong>Vente Originale:</strong> #${data.originalSaleId}
                </div>
                <div class="return-barcode" style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Code de Vente</div>
                    <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #374151;">${returnBarcode}</div>
                </div>
            </div>
        </div>

        <div class="client-info">
            <div class="client-title">Informations Client</div>
            <div class="client-details">
                ${data.client ? `
                    <strong>${data.client.name}</strong><br>
                    ${data.client.address ? `${data.client.address}<br>` : ''}
                    ${data.client.phone ? `Tél: ${data.client.phone}` : ''}
                ` : `
                    <strong>Client anonyme</strong><br>
                    <span style="color: #6b7280;">Vente directe</span>
                `}
            </div>
        </div>

        <div class="section-title">Produits Retournés</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Produit</th>
                    <th class="text-center">Quantité</th>
                    <th class="text-right">Prix Unitaire</th>
                    <th class="text-right">Total</th>
                    ${data.returnedItems.some(item => item.reason) ? '<th>Motif</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${data.returnedItems.map(item => `
                <tr>
                    <td>
                        <strong>${item.product_name}</strong>
                        ${item.product_reference ? `<br><small>Réf: ${item.product_reference}</small>` : ''}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatPrice(item.unit_price)}</td>
                    <td class="text-right">${formatPrice(item.total)}</td>
                    ${data.returnedItems.some(i => i.reason) ? `<td>${item.reason || '-'}</td>` : ''}
                </tr>
                `).join('')}
            </tbody>
        </table>

        ${data.exchangeItems && data.exchangeItems.length > 0 ? `
        <div class="section-title">Produits Pris en Échange</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Produit</th>
                    <th class="text-center">Quantité</th>
                    <th class="text-right">Prix Unitaire</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.exchangeItems.map(item => `
                <tr>
                    <td>
                        <strong>${item.product_name}</strong>
                        ${item.product_reference ? `<br><small>Réf: ${item.product_reference}</small>` : ''}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatPrice(item.unit_price)}</td>
                    <td class="text-right">${formatPrice(item.total)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="summary">
            <div class="summary-row">
                <span>Total Produits Retournés:</span>
                <span>${formatPrice(data.totalRefundAmount)}</span>
            </div>
            ${data.totalExchangeAmount !== undefined ? `
            <div class="summary-row">
                <span>Total Produits Échangés:</span>
                <span>${formatPrice(data.totalExchangeAmount)}</span>
            </div>
            ` : ''}
            ${data.balanceAdjustment !== undefined && data.balanceAdjustment !== 0 ? `
            <div class="summary-row total">
                <span>${data.balanceAdjustment > 0 ? 'Montant à Payer:' : 'Montant à Rembourser:'}</span>
                <span class="${data.balanceAdjustment > 0 ? 'balance-positive' : 'balance-negative'}">
                    ${formatPrice(Math.abs(data.balanceAdjustment))}
                </span>
            </div>
            ` : `
            <div class="summary-row total">
                <span>${isRefund ? 'Montant Remboursé:' : 'Échange Équilibré:'}</span>
                <span>${isRefund ? formatPrice(data.totalRefundAmount) : formatPrice(0)}</span>
            </div>
            `}
        </div>

        <!-- Informations de Paiement Détaillées -->
        <div class="payment-info" style="margin-top: 20px; padding: 20px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div class="section-title" style="margin: 0 0 15px 0; font-size: 16px;">Informations de Paiement</div>

            <div class="payment-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="payment-item">
                    <span style="font-weight: bold; color: #374151;">Mode de Paiement:</span><br>
                    <span style="color: #6b7280;">${data.payment_method === 'cash' ? 'Espèces' :
                           data.payment_method === 'card' ? 'Carte' :
                           data.payment_method === 'check' ? 'Chèque' : 'Crédit'}</span>
                </div>

                <div class="payment-item">
                    <span style="font-weight: bold; color: #374151;">Statut de Paiement:</span><br>
                    <span style="color: ${data.payment_status === 'paid' ? '#059669' : data.payment_status === 'partial' ? '#d97706' : '#dc2626'};">
                        ${data.payment_status === 'paid' ? 'Payé' :
                          data.payment_status === 'partial' ? 'Paiement partiel' : 'Non payé'}
                    </span>
                </div>

                ${data.amount_paid !== undefined ? `
                <div class="payment-item">
                    <span style="font-weight: bold; color: #374151;">Montant Payé (DH):</span><br>
                    <span style="color: #059669; font-weight: bold;">${formatPrice(data.amount_paid)}</span>
                </div>
                ` : ''}

                <div class="payment-item">
                    <span style="font-weight: bold; color: #374151;">Montant Remboursé (DH):</span><br>
                    <span style="color: #dc2626; font-weight: bold;">${formatPrice(data.totalRefundAmount)}</span>
                </div>
            </div>
        </div>

        ${data.notes ? `
        <div class="notes">
            <div class="notes-title">Notes:</div>
            <div>${data.notes}</div>
        </div>
        ` : ''}

        <!-- Pied de page avec informations du stock -->
        <div class="footer" style="margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 6px; border-top: 3px solid ${titleColor};">
            <div class="footer-content" style="text-align: center;">
                <div class="footer-store-info" style="margin-bottom: 15px;">
                    <div class="footer-store-name" style="font-size: 18px; font-weight: bold; color: ${titleColor}; margin-bottom: 8px;">
                        ${stockInfo.name}
                    </div>
                    <div class="footer-store-details" style="color: #6b7280; line-height: 1.6;">
                        📞 ${stockInfo.phone}<br>
                        📍 ${stockInfo.address}
                        ${stockInfo.email ? `<br>📧 ${stockInfo.email}` : ''}
                    </div>
                </div>

                <div class="footer-thanks" style="font-size: 16px; color: ${titleColor}; font-weight: bold; margin: 15px 0;">
                    ✨ Merci de votre confiance ! ✨
                </div>

                <div class="footer-meta" style="font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                    <div>Document généré automatiquement le ${currentDate}</div>
                    ${data.seller ? `<div>Traité par: ${data.seller.name}</div>` : ''}
                    <div style="margin-top: 8px; font-family: 'Courier New', monospace; font-weight: bold;">
                        Code de Vente: ${returnBarcode}
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

export function downloadReturnInvoiceHTML(data: ReturnInvoiceData) {
  const html = generateReturnInvoiceHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.returnType === 'refund' ? 'remboursement' : 'echange'}_${data.invoiceNumber}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function printReturnInvoice(data: ReturnInvoiceData) {
  const html = generateReturnInvoiceHTML(data)
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

export function generateReturnInvoiceNumber(returnType: 'refund' | 'exchange', returnId: number): string {
  const prefix = returnType === 'refund' ? 'RMB' : 'ECH'
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const id = String(returnId).padStart(4, '0')

  return `${prefix}-${year}${month}${day}-${id}`
}

export function generateReturnBarcode(returnId: number, returnType: 'refund' | 'exchange'): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const paddedId = String(returnId).padStart(6, '0')
  const typeCode = returnType === 'refund' ? 'R' : 'E'

  return `${year}${month}${day}${typeCode}${paddedId}`
}
