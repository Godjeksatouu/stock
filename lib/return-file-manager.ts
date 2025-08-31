import { ReturnInvoiceData, generateReturnInvoiceHTML } from './return-invoice-generator'

export interface ReturnFileData {
  returnId: number
  returnType: 'refund' | 'exchange'
  invoiceNumber: string
  originalSaleId: number
  clientName?: string
  totalAmount: number
  createdAt: Date
}

export class ReturnFileManager {
  private static baseDir = 'factures'
  private static refundDir = 'remboursements'
  private static exchangeDir = 'echanges'

  /**
   * Crée la structure de dossiers nécessaire pour les factures de retour
   */
  static async ensureDirectoryStructure(): Promise<void> {
    try {
      // En environnement web, nous ne pouvons pas créer de dossiers physiques
      // Cette fonction est préparée pour un environnement Node.js/Electron
      console.log('Directory structure ensured for return invoices')
    } catch (error) {
      console.error('Error ensuring directory structure:', error)
    }
  }

  /**
   * Génère le chemin de fichier pour une facture de retour
   */
  static generateFilePath(returnType: 'refund' | 'exchange', invoiceNumber: string): string {
    const subDir = returnType === 'refund' ? this.refundDir : this.exchangeDir
    const fileName = `${invoiceNumber}.html`
    return `${this.baseDir}/${subDir}/${fileName}`
  }

  /**
   * Sauvegarde une facture de retour dans le système de fichiers
   * En environnement web, cela télécharge le fichier
   */
  static async saveReturnInvoice(data: ReturnInvoiceData): Promise<string> {
    try {
      await this.ensureDirectoryStructure()
      
      const html = generateReturnInvoiceHTML(data)
      const filePath = this.generateFilePath(data.returnType, data.invoiceNumber)
      
      // En environnement web, nous téléchargeons le fichier
      this.downloadFile(html, data.invoiceNumber, data.returnType)
      
      // Sauvegarder les métadonnées dans localStorage pour référence
      this.saveInvoiceMetadata(data)
      
      return filePath
    } catch (error) {
      console.error('Error saving return invoice:', error)
      throw new Error('Erreur lors de la sauvegarde de la facture')
    }
  }

  /**
   * Télécharge un fichier HTML
   */
  private static downloadFile(content: string, invoiceNumber: string, returnType: 'refund' | 'exchange'): void {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    
    const fileName = `${returnType === 'refund' ? 'remboursement' : 'echange'}_${invoiceNumber}.html`
    
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // Nettoyer l'URL après un délai
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  /**
   * Sauvegarde les métadonnées de la facture dans localStorage
   */
  private static saveInvoiceMetadata(data: ReturnInvoiceData): void {
    try {
      const key = 'return_invoices_metadata'
      const existing = localStorage.getItem(key)
      const metadata = existing ? JSON.parse(existing) : []
      
      const newMetadata: ReturnFileData = {
        returnId: data.id,
        returnType: data.returnType,
        invoiceNumber: data.invoiceNumber,
        originalSaleId: data.originalSaleId,
        clientName: data.client?.name,
        totalAmount: data.returnType === 'refund' ? data.totalRefundAmount : (data.totalExchangeAmount || 0),
        createdAt: new Date()
      }
      
      metadata.push(newMetadata)
      localStorage.setItem(key, JSON.stringify(metadata))
    } catch (error) {
      console.error('Error saving invoice metadata:', error)
    }
  }

  /**
   * Récupère les métadonnées de toutes les factures de retour
   */
  static getInvoiceMetadata(): ReturnFileData[] {
    try {
      const key = 'return_invoices_metadata'
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error retrieving invoice metadata:', error)
      return []
    }
  }

  /**
   * Récupère les métadonnées d'une facture spécifique
   */
  static getInvoiceMetadataById(returnId: number): ReturnFileData | null {
    const metadata = this.getInvoiceMetadata()
    return metadata.find(item => item.returnId === returnId) || null
  }

  /**
   * Supprime les métadonnées d'une facture
   */
  static removeInvoiceMetadata(returnId: number): void {
    try {
      const key = 'return_invoices_metadata'
      const metadata = this.getInvoiceMetadata()
      const filtered = metadata.filter(item => item.returnId !== returnId)
      localStorage.setItem(key, JSON.stringify(filtered))
    } catch (error) {
      console.error('Error removing invoice metadata:', error)
    }
  }

  /**
   * Nettoie les métadonnées anciennes (plus de 6 mois)
   */
  static cleanupOldMetadata(): void {
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const metadata = this.getInvoiceMetadata()
      const filtered = metadata.filter(item => {
        const createdAt = new Date(item.createdAt)
        return createdAt > sixMonthsAgo
      })
      
      const key = 'return_invoices_metadata'
      localStorage.setItem(key, JSON.stringify(filtered))
    } catch (error) {
      console.error('Error cleaning up old metadata:', error)
    }
  }

  /**
   * Exporte toutes les métadonnées vers un fichier JSON
   */
  static exportMetadata(): void {
    try {
      const metadata = this.getInvoiceMetadata()
      const json = JSON.stringify(metadata, null, 2)
      
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      
      const fileName = `return_invoices_metadata_${new Date().toISOString().split('T')[0]}.json`
      
      a.href = url
      a.download = fileName
      a.style.display = 'none'
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (error) {
      console.error('Error exporting metadata:', error)
    }
  }

  /**
   * Statistiques des factures de retour
   */
  static getStatistics(): {
    totalRefunds: number
    totalExchanges: number
    totalRefundAmount: number
    totalExchangeAmount: number
    lastMonth: {
      refunds: number
      exchanges: number
    }
  } {
    try {
      const metadata = this.getInvoiceMetadata()
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      
      const stats = {
        totalRefunds: 0,
        totalExchanges: 0,
        totalRefundAmount: 0,
        totalExchangeAmount: 0,
        lastMonth: {
          refunds: 0,
          exchanges: 0
        }
      }
      
      metadata.forEach(item => {
        const createdAt = new Date(item.createdAt)
        
        if (item.returnType === 'refund') {
          stats.totalRefunds++
          stats.totalRefundAmount += item.totalAmount
          if (createdAt > lastMonth) {
            stats.lastMonth.refunds++
          }
        } else {
          stats.totalExchanges++
          stats.totalExchangeAmount += item.totalAmount
          if (createdAt > lastMonth) {
            stats.lastMonth.exchanges++
          }
        }
      })
      
      return stats
    } catch (error) {
      console.error('Error calculating statistics:', error)
      return {
        totalRefunds: 0,
        totalExchanges: 0,
        totalRefundAmount: 0,
        totalExchangeAmount: 0,
        lastMonth: { refunds: 0, exchanges: 0 }
      }
    }
  }
}

// Initialiser le nettoyage automatique au chargement
if (typeof window !== 'undefined') {
  // Nettoyer les anciennes métadonnées une fois par jour
  const lastCleanup = localStorage.getItem('last_metadata_cleanup')
  const today = new Date().toDateString()
  
  if (lastCleanup !== today) {
    ReturnFileManager.cleanupOldMetadata()
    localStorage.setItem('last_metadata_cleanup', today)
  }
}
