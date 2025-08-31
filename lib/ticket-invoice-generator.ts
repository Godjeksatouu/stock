import { formatPrice } from './currency'

// Configuration des informations de stock pour les factures
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

// Fonction pour générer un code-barres basé sur l'ID de vente
export function generateBarcodeForSale(saleId: number): string {
  // Format: YYYYMMDD + ID de vente sur 6 chiffres
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const paddedId = String(saleId).padStart(6, '0')

  return `${year}${month}${day}${paddedId}`
}

// Fonction pour générer le SVG du code-barres (Code 128)
export function generateBarcodeHTML(barcode: string): string {
  // Génération simple d'un code-barres visuel avec des barres
  const bars = barcode.split('').map((digit, index) => {
    const width = parseInt(digit) % 4 + 1 // Largeur entre 1 et 4
    const height = index % 2 === 0 ? 30 : 25 // Hauteur alternée
    return `<rect x="${index * 6}" y="0" width="${width}" height="${height}" fill="#000"/>`
  }).join('')

  return `
    <svg width="200" height="40" viewBox="0 0 ${barcode.length * 6} 35" style="margin: 8px auto; display: block;">
      ${bars}
    </svg>
    <div style="text-align: center; font-size: 8px; font-family: monospace; margin-top: 4px; letter-spacing: 1px;">
      ${barcode}
    </div>
  `
}

export interface TicketInvoiceData {
  id: number
  invoiceNumber: string
  date: string
  stockName: string
  stockId: string // Ajout du stockId pour identifier le stock
  stockInfo?: {
    address?: string
    phone?: string
    email?: string
  }
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
    discount_amount?: number
    discount_type?: string
    discount_value?: number
  }>
  subtotal: number
  global_discount_amount?: number
  global_discount_type?: string
  global_discount_value?: number
  total: number
  payment_method: string
  payment_status: string
  amount_paid?: number
  amount_remaining?: number
  changeAmount?: number
  notes?: string
  barcode?: string
  showPaymentInfo?: boolean
  showSellerInfo?: boolean
}

export function generateTicketInvoiceHTML(data: TicketInvoiceData): string {
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
    <title>Facture ${data.invoiceNumber} - ${data.stockName}</title>
    <style>
        /* Format ticket professionnel optimisé pour impression */
        @page {
            size: 80mm auto;
            margin: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: white;
            color: #1a1a1a;
            font-size: 10px;
            line-height: 1.3;
            width: 80mm;
            box-sizing: border-box;
        }

        .ticket-container {
            width: 100%;
            max-width: 80mm;
            padding: 12px;
            box-sizing: border-box;
        }
        
        /* En-tête professionnel */
        .header {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #2563eb;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            margin: -12px -12px 16px -12px;
            padding: 16px 12px 12px 12px;
        }

        .brand-section {
            margin-bottom: 8px;
        }

        .stock-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 8px;
            padding: 6px 12px;
            background-color: #dbeafe;
            border-radius: 6px;
            display: inline-block;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .company-details {
            font-size: 8px;
            color: #6b7280;
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .invoice-info {
            background-color: white;
            padding: 6px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
        }

        .invoice-title {
            font-size: 11px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 3px;
        }

        .invoice-number {
            font-size: 10px;
            font-weight: 500;
            color: #2563eb;
            margin-bottom: 2px;
        }

        .invoice-date {
            font-size: 8px;
            color: #6b7280;
        }
        
        /* Section client professionnelle */
        .client-section {
            margin: 12px 0;
            padding: 8px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 3px solid #10b981;
        }

        .client-title {
            font-size: 9px;
            font-weight: 600;
            color: #059669;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
        }

        .client-details {
            font-size: 9px;
            color: #374151;
            line-height: 1.4;
        }

        .client-name {
            font-weight: 600;
            color: #1f2937;
        }
        
        /* Section produits élégante */
        .items-section {
            margin: 12px 0;
        }

        .items-header {
            background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            font-weight: 600;
            font-size: 8px;
            padding: 6px 8px;
            margin: 0 -8px 8px -8px;
            display: flex;
            justify-content: space-between;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .item-row {
            margin-bottom: 8px;
            padding: 6px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .item-row:last-child {
            border-bottom: none;
        }

        .item-name {
            font-weight: 600;
            font-size: 9px;
            color: #1f2937;
            margin-bottom: 2px;
            word-wrap: break-word;
            line-height: 1.3;
        }

        .item-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
        }

        .item-qty-price {
            color: #6b7280;
            flex: 1;
        }

        .item-discount {
            color: #059669;
            font-size: 7px;
            font-weight: 600;
            margin-top: 1px;
        }

        .item-total {
            font-weight: 600;
            color: #1e40af;
            font-size: 9px;
        }
        
        /* Section totaux premium */
        .totals-section {
            margin-top: 12px;
            padding: 10px;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-radius: 6px;
            border: 1px solid #cbd5e1;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 9px;
            color: #4b5563;
        }

        .total-row.final {
            font-weight: 700;
            font-size: 11px;
            color: #1e40af;
            border-top: 2px solid #2563eb;
            padding-top: 6px;
            margin-top: 6px;
            background-color: white;
            padding: 6px;
            margin: 6px -10px -10px -10px;
            border-radius: 0 0 6px 6px;
        }
        
        /* Section paiement stylée */
        .payment-section {
            margin-top: 12px;
            padding: 8px;
            background-color: #fef3c7;
            border-radius: 6px;
            border-left: 3px solid #f59e0b;
        }

        .payment-title {
            font-size: 8px;
            font-weight: 600;
            color: #92400e;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
        }

        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 9px;
            color: #78350f;
        }

        .payment-value {
            font-weight: 600;
        }

        .change-amount {
            color: #059669;
            font-weight: 700;
            font-size: 10px;
        }
        
        /* Section notes élégante */
        .notes-section {
            margin-top: 12px;
            padding: 8px;
            background-color: #fef7ff;
            border-radius: 6px;
            border-left: 3px solid #a855f7;
        }

        .notes-title {
            font-size: 8px;
            font-weight: 600;
            color: #7c2d12;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
        }

        .notes-content {
            font-size: 9px;
            color: #374151;
            line-height: 1.4;
        }

        /* Pied de page professionnel */
        .footer {
            margin-top: 16px;
            padding: 12px 0;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            margin-left: -12px;
            margin-right: -12px;
            margin-bottom: -12px;
            padding-left: 12px;
            padding-right: 12px;
        }

        .footer-content {
            font-size: 8px;
            color: #6b7280;
            line-height: 1.4;
        }

        .footer-brand {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 2px;
        }

        .footer-thanks {
            font-style: italic;
            color: #059669;
            margin-top: 8px;
        }

        .footer-store-info {
            margin-bottom: 8px;
            padding: 8px;
            background-color: #f8fafc;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }

        .footer-store-name {
            font-weight: 700;
            color: #1e40af;
            font-size: 9px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .footer-store-details {
            font-size: 7px;
            color: #4b5563;
            line-height: 1.5;
        }


        
        /* Boutons d'action professionnels */
        .action-buttons {
            position: fixed;
            top: 15px;
            right: 15px;
            display: flex;
            gap: 8px;
            z-index: 1000;
        }

        .action-btn {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            transition: all 0.2s ease;
        }

        .action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .action-btn.secondary {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .action-btn.secondary:hover {
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        @media print {
            .action-buttons {
                display: none;
            }

            body {
                width: 80mm;
                margin: 0;
                padding: 0;
                background: white;
            }

            .ticket-container {
                page-break-inside: avoid;
                padding: 8px;
            }

            .header {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }

        /* Responsive pour aperçu écran */
        @media screen and (max-width: 500px) {
            body {
                width: 100%;
                max-width: 90mm;
                margin: 0 auto;
                background-color: #f1f5f9;
                padding: 20px;
            }

            .ticket-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                border: 1px solid #e2e8f0;
            }

            .action-buttons {
                position: relative;
                top: auto;
                right: auto;
                justify-content: center;
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="action-buttons">
        <button class="action-btn" onclick="window.print()">🖨️ Imprimer</button>
        <button class="action-btn secondary" onclick="window.close()">✕ Fermer</button>
    </div>

    <div class="ticket-container">
        <!-- En-tête simplifié -->
        <div class="header">
            <div class="brand-section">
                <div class="stock-name">${data.stockName}</div>
            </div>

            <div class="invoice-info">
                <div class="invoice-title">FACTURE DE VENTE</div>
                <div class="invoice-number">N° ${data.invoiceNumber}</div>
                <div class="invoice-date">${currentDate}</div>
            </div>
        </div>

        <!-- Section client professionnelle -->
        ${data.client ? `
        <div class="client-section">
            <div class="client-title">Informations Client</div>
            <div class="client-details">
                <div class="client-name">${data.client.name}</div>
                ${data.client.address ? `<div>${data.client.address}</div>` : ''}
                ${data.client.phone ? `<div>📞 ${data.client.phone}</div>` : ''}
            </div>
        </div>
        ` : `
        <div class="client-section">
            <div class="client-title">Type de Vente</div>
            <div class="client-details">
                <div class="client-name">🛒 Vente Directe</div>
            </div>
        </div>
        `}

        <!-- Section produits élégante -->
        <div class="items-section">
            <div class="items-header">
                <span>📦 Articles</span>
                <span>💰 Total</span>
            </div>

            ${data.items.map((item, index) => `
            <div class="item-row">
                <div class="item-name">${index + 1}. ${item.product_name}</div>
                <div class="item-details">
                    <div class="item-qty-price">
                        ${item.quantity} × ${formatPrice(item.unit_price)}
                        ${item.discount_amount && item.discount_amount > 0 ? `
                        <div class="item-discount">
                            Remise: -${formatPrice(item.discount_amount)}
                        </div>
                        ` : ''}
                    </div>
                    <div class="item-total">${formatPrice(item.total)}</div>
                </div>
            </div>
            `).join('')}
        </div>

        <!-- Section totaux premium -->
        <div class="totals-section">
            ${data.subtotal !== data.total || data.global_discount_amount ? `
            <div class="total-row">
                <span>Sous-total:</span>
                <span>${formatPrice(data.subtotal)}</span>
            </div>
            ` : ''}

            ${data.global_discount_amount && data.global_discount_amount > 0 ? `
            <div class="total-row" style="color: #059669;">
                <span>🎯 Remise globale:</span>
                <span>-${formatPrice(data.global_discount_amount)}</span>
            </div>
            ` : ''}

            <div class="total-row final">
                <span>💳 TOTAL À PAYER</span>
                <span>${formatPrice(data.total)}</span>
            </div>

            ${data.amount_paid !== undefined ? `
            <div class="total-row" style="font-weight: 600; color: #059669; background-color: #ecfdf5; margin: 6px -10px 0 -10px; padding: 6px 10px; border-radius: 4px;">
                <span>💰 Montant payé (DH)</span>
                <span>${formatPrice(data.amount_paid)}</span>
            </div>
            ` : ''}
        </div>

        <!-- Section paiement stylée (conditionnelle) -->
        ${data.showPaymentInfo !== false ? `
        <div class="payment-section">
            <div class="payment-title">💰 Informations de Paiement</div>

            <div class="payment-row">
                <span>Mode:</span>
                <span class="payment-value">${
                  data.payment_method === 'cash' ? '💵 Espèces' :
                  data.payment_method === 'card' ? '💳 Carte' :
                  data.payment_method === 'check' ? '📝 Chèque' : '📋 Crédit'
                }</span>
            </div>

            <div class="payment-row">
                <span>Statut:</span>
                <span class="payment-value">${
                  data.payment_status === 'paid' ? '✅ Payé' :
                  data.payment_status === 'partial' ? '⏳ Partiel' : '⏰ En attente'
                }</span>
            </div>

            ${data.amount_paid !== undefined ? `
            <div class="payment-row">
                <span>Montant payé:</span>
                <span class="payment-value">${formatPrice(data.amount_paid)}</span>
            </div>
            ` : ''}

            ${data.changeAmount !== undefined && data.changeAmount > 0 ? `
            <div class="payment-row">
                <span>💰 Montant à rendre:</span>
                <span class="payment-value change-amount">${formatPrice(data.changeAmount)}</span>
            </div>
            ` : ''}

            ${data.amount_remaining !== undefined && data.amount_remaining > 0 ? `
            <div class="payment-row">
                <span>⚠️ Reste à payer:</span>
                <span class="payment-value">${formatPrice(data.amount_remaining)}</span>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Notes élégantes -->
        ${data.notes ? `
        <div class="notes-section">
            <div class="notes-title">📝 Notes</div>
            <div class="notes-content">${data.notes}</div>
        </div>
        ` : ''}

        <!-- Code-barres de la vente -->
        ${data.barcode ? `
        <div style="margin-top: 16px; padding: 12px 0; border-top: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 8px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">
                CODE DE VENTE
            </div>
            ${generateBarcodeHTML(data.barcode)}
        </div>
        ` : ''}

        <!-- Pied de page avec informations du stock -->
        <div class="footer">
            <div class="footer-content">
                ${(() => {
                  const stockInfo = getStockInfo(data.stockId)
                  return `
                    <div class="footer-store-info">
                      <div class="footer-store-name">${stockInfo.name}</div>
                      <div class="footer-store-details">
                        📞 ${stockInfo.phone}<br>
                        📍 ${stockInfo.address}
                        ${stockInfo.email ? `<br>📧 ${stockInfo.email}` : ''}
                      </div>
                    </div>
                  `
                })()}



                <div class="footer-thanks">✨ Merci de votre confiance ! ✨</div>
                <div style="margin-top: 6px; font-size: 7px; color: #9ca3af;">
                    Facture générée le ${currentDate}
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

export function downloadTicketInvoiceHTML(data: TicketInvoiceData) {
  const html = generateTicketInvoiceHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ticket_${data.invoiceNumber}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function printTicketInvoice(data: TicketInvoiceData) {
  const html = generateTicketInvoiceHTML(data)
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

export function generateTicketInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const time = String(now.getTime()).slice(-6) // Last 6 digits of timestamp

  return `TIC-${year}${month}${day}-${time}`
}
