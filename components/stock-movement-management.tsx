"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, ArrowRightLeft, Package, CheckCircle, AlertTriangle, Clock, Trash2, FileText, Download, Printer, Scan } from "lucide-react"
import { stockMovementsApi, productsApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"
import { STOCK_MAPPING } from "@/lib/types"
import { downloadMovementInvoice, printMovementInvoice, generatePrintableHTML } from "@/lib/pdf-generator"
import { formatDate, formatTime, formatDateTime, getCurrentISOString } from "@/lib/date-utils"

interface StockMovementManagementProps {
  stockId: string
}

export default function StockMovementManagement({ stockId }: StockMovementManagementProps) {
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState<any>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [recentlyScanned, setRecentlyScanned] = useState<string[]>([])

  // Scanner detection states
  const [scanBuffer, setScanBuffer] = useState('')
  const [lastKeyTime, setLastKeyTime] = useState(0)

  // Form state
  const [formData, setFormData] = useState({
    to_stock_id: '',
    recipient_name: '',
    notes: '',
    items: [] as any[]
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  // Stock options (only libraries, not depot)
  const stockOptions = [
    { id: '1', name: 'Librairie Al Ouloum', value: 'al-ouloum' },
    { id: '2', name: 'Librairie La Renaissance', value: 'renaissance' }
  ]

  // Function to clean and normalize barcode input (same as cashier system)
  const cleanBarcode = (input: string): string => {
    if (!input) return ''

    // First, try to extract only numeric characters
    let cleaned = input.replace(/[^0-9]/g, '')

    // If we have a good numeric result, return it
    if (cleaned.length >= 8) {
      return cleaned
    }

    // French keyboard mapping for barcode scanners
    const frenchToNumeric: { [key: string]: string } = {
      'à': '0', '&': '1', 'é': '2', '"': '3', "'": '4',
      '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9',
      'À': '0', '0': '0', '1': '1', '2': '2', '3': '3',
      '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
    }

    // Map French characters to numbers
    const frenchMapped = input.split('').map(char => frenchToNumeric[char] || '').join('')

    // Use the better result
    if (frenchMapped.length > cleaned.length) {
      cleaned = frenchMapped
    }

    // Additional cleaning: remove any remaining non-numeric characters
    cleaned = cleaned.replace(/[^0-9]/g, '')

    return cleaned
  }

  useEffect(() => {
    fetchData()
  }, [stockId])

  // Enhanced keyboard shortcuts with scanner detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTime

      // Scanner detection: if time between keystrokes is very short (< 50ms), it's likely a scanner
      if (timeDiff < 50 && timeDiff > 0) {
        setIsScanning(true)
      }

      // If it's been more than 100ms since last keystroke, reset scanning state
      if (timeDiff > 100) {
        setIsScanning(false)
        setScanBuffer('')
      }

      setLastKeyTime(currentTime)

      // Only process if we're in the barcode input
      const target = e.target as HTMLElement
      if (target.id === 'barcode-input' && showCreateDialog) {
        // Add character to scan buffer
        if (e.key.length === 1) { // Single character keys
          setScanBuffer(prev => prev + e.key)
        }

        // Handle Enter key (scanner typically sends Enter at the end)
        if (e.key === 'Enter' && isScanning && scanBuffer.length >= 6) {
          e.preventDefault()
          const rawScannedCode = scanBuffer
          const cleanedCode = cleanBarcode(rawScannedCode)
          setScanBuffer('')
          setIsScanning(false)

          // Use cleaned code if it's better, otherwise use raw
          const finalCode = cleanedCode.length >= 6 ? cleanedCode : rawScannedCode

          // Set the barcode input and trigger search
          setBarcodeInput(finalCode)
          setTimeout(() => {
            handleBarcodeInput(finalCode)
          }, 100)
          return
        }
      }

      // Manual keyboard shortcuts
      // Ctrl/Cmd + Shift + S to start scanning
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        if (showCreateDialog && !isScanning) {
          startScanning()
        }
      }

      // Escape to stop scanning
      if (e.key === 'Escape' && isScanning) {
        e.preventDefault()
        stopScanning()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showCreateDialog, isScanning, lastKeyTime, scanBuffer])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [movementsResponse, productsResponse] = await Promise.all([
        stockMovementsApi.getAll(stockId),
        productsApi.getAll(stockId)
      ])

      if (movementsResponse.success) setMovements(movementsResponse.data)

      // Handle products response structure
      if (productsResponse.success) {
        // Check if response has products array in data property
        const productsData = productsResponse.data?.products || productsResponse.data || []
        console.log('📦 Products data structure:', {
          hasData: !!productsResponse.data,
          hasProductsArray: !!productsResponse.data?.products,
          isArray: Array.isArray(productsData),
          count: Array.isArray(productsData) ? productsData.length : 0
        })
        setProducts(Array.isArray(productsData) ? productsData : [])
      } else {
        console.warn('⚠️ Products API failed:', productsResponse)
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setProducts([]) // Ensure products is always an array
    } finally {
      setLoading(false)
    }
  }

  const fetchMovementDetails = async (movementId: number) => {
    try {
      const response = await stockMovementsApi.getById(movementId)
      if (response.success) {
        setSelectedMovement(response.data)
      }
    } catch (error) {
      console.error('Error fetching movement details:', error)
      alert('Erreur lors du chargement des détails du mouvement')
    }
  }

  const handleCreateMovement = async () => {
    try {
      if (!formData.to_stock_id || !formData.recipient_name || formData.items.length === 0) {
        alert('Veuillez remplir tous les champs obligatoires')
        return
      }

      // Validate that all items have valid data
      const invalidItems = formData.items.filter(item =>
        !item.product_id || item.quantity <= 0 || item.unit_price <= 0
      )

      if (invalidItems.length > 0) {
        alert('Veuillez vérifier que tous les produits ont une quantité et un prix valides')
        return
      }

      const movementData = {
        from_stock_id: stockDbId, // Always depot
        to_stock_id: formData.to_stock_id, // send slug; API maps to numeric
        user_id: JSON.parse(localStorage.getItem("user") || '{}').id,
        recipient_name: formData.recipient_name,
        notes: formData.notes,
        items: formData.items
      }

      const response = await stockMovementsApi.create(movementData)
      if (response.success) {
        setShowCreateDialog(false)
        resetForm()
        fetchData()

        // Generate and download invoice automatically
        const invoiceData = {
          movement_number: response.data.movement_number,
          created_at: getCurrentISOString(),
          from_stock_name: 'Dépôt Général',
          to_stock_name: stockOptions.find(s => s.value === formData.to_stock_id)?.name || '',
          recipient_name: formData.recipient_name,
          total_amount: getTotalAmount(),
          notes: formData.notes,
          items: formData.items.map(item => ({
            product_name: item.product_name || '',
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            total_price: Number(item.quantity || 0) * Number(item.unit_price || 0)
          }))
        }

        // Auto-download the invoice
        downloadMovementInvoice(invoiceData)

        alert(`Mouvement créé avec succès! Numéro: ${response.data.movement_number}\nLa facture a été téléchargée automatiquement.`)
      }
    } catch (error) {
      console.error('Error creating movement:', error)
      alert('Erreur lors de la création du mouvement')
    }
  }

  const resetForm = () => {
    setFormData({
      to_stock_id: '',
      recipient_name: '',
      notes: '',
      items: []
    })
    setBarcodeInput('')
    setIsScanning(false)
    setRecentlyScanned([])
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: null,
        product_name: '',
        quantity: 1,
        unit_price: 0,
        notes: ''
      }]
    }))
    // Disable scanning mode when adding manually
    setIsScanning(false)
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const handleBarcodeInput = (barcode: string) => {
    if (!barcode.trim()) return

    // Clean the barcode input to handle scanner encoding issues
    const cleanedBarcode = cleanBarcode(barcode.trim())
    console.log('🔍 Original barcode:', barcode.trim())
    console.log('🔍 Cleaned barcode:', cleanedBarcode)

    const searchBarcode = cleanedBarcode || barcode.trim()

    // Ensure products is an array before using find
    if (!Array.isArray(products)) {
      console.warn('⚠️ Products is not an array:', products)
      console.log('📦 Products state:', products)
      return
    }

    if (products.length === 0) {
      console.warn('⚠️ Products array is empty')
      return
    }

    // Find product by barcode (check multiple possible fields)
    const product = products.find(p => {
      // Check various possible barcode fields
      const possibleBarcodes = [
        p.reference,
        p.barcode,
        p.code_barre,
        p.ean,
        p.upc,
        p.isbn
      ].filter(Boolean) // Remove null/undefined values

      return possibleBarcodes.some(code => {
        if (!code) return false
        const codeStr = code.toString().toLowerCase()
        // Try both cleaned and original barcode
        return codeStr === searchBarcode.toLowerCase() ||
               codeStr === barcode.trim().toLowerCase()
      })
    })

    if (product) {
      // Check if product has sufficient stock
      if (product.quantity <= 0) {
        alert(`⚠️ Stock insuffisant pour ${product.name} (Stock: ${product.quantity})`)
        setBarcodeInput('')
        return
      }

      // Check if product is already in the list
      const existingItemIndex = formData.items.findIndex(item => item.product_id === product.id)

      if (existingItemIndex >= 0) {
        const currentQuantity = formData.items[existingItemIndex].quantity
        const newQuantity = currentQuantity + 1

        // Check if new quantity exceeds available stock
        if (newQuantity > product.quantity) {
          alert(`⚠️ Quantité demandée (${newQuantity}) dépasse le stock disponible (${product.quantity}) pour ${product.name}`)
          setBarcodeInput('')
          return
        }

        // Increase quantity if product already exists
        updateItem(existingItemIndex, 'quantity', newQuantity)
        alert(`✅ Quantité augmentée pour ${product.name} (${newQuantity})`)
      } else {
        // Add new product to the list
        const newItem = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price || 0,
          notes: ''
        }

        setFormData(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }))

        alert(`✅ Produit ajouté: ${product.name}`)
      }

      // Add to recently scanned list
      setRecentlyScanned(prev => {
        const updated = [product.name, ...prev.filter(name => name !== product.name)]
        return updated.slice(0, 5) // Keep only last 5 scanned products
      })

      // Clear barcode input and keep scanning mode active
      setBarcodeInput('')

      // Refocus on barcode input for continuous scanning
      setTimeout(() => {
        const barcodeInputElement = document.getElementById('barcode-input')
        if (barcodeInputElement && isScanning) {
          barcodeInputElement.focus()
        }
      }, 100)
    } else {
      alert(`❌ Produit non trouvé pour le code-barres: ${searchBarcode}${cleanedBarcode !== barcode.trim() ? ` (original: ${barcode.trim()})` : ''}`)
      setBarcodeInput('')

      // Keep focus for next scan
      setTimeout(() => {
        const barcodeInputElement = document.getElementById('barcode-input')
        if (barcodeInputElement && isScanning) {
          barcodeInputElement.focus()
        }
      }, 100)
    }
  }

  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBarcodeInput(barcodeInput)
    }
  }

  const startScanning = () => {
    setIsScanning(true)
    setBarcodeInput('')
    // Focus on barcode input for immediate scanning
    setTimeout(() => {
      const barcodeInputElement = document.getElementById('barcode-input')
      if (barcodeInputElement) {
        barcodeInputElement.focus()
      }
    }, 100)
  }

  const stopScanning = () => {
    setIsScanning(false)
    setBarcodeInput('')
  }

  const handleDownloadInvoice = (movement: any) => {
    const invoiceData = {
      movement_number: movement.movement_number,
      created_at: movement.created_at,
      from_stock_name: movement.from_stock_name,
      to_stock_name: movement.to_stock_name,
      recipient_name: movement.recipient_name,
      total_amount: movement.total_amount,
      notes: movement.notes,
      items: movement.items || []
    }
    downloadMovementInvoice(invoiceData)
  }

  const handlePrintInvoice = (movement: any) => {
    const invoiceData = {
      movement_number: movement.movement_number,
      created_at: movement.created_at,
      from_stock_name: movement.from_stock_name,
      to_stock_name: movement.to_stock_name,
      recipient_name: movement.recipient_name,
      total_amount: movement.total_amount,
      notes: movement.notes,
      items: movement.items || []
    }

    // Generate printable HTML and open in new window
    const htmlContent = generatePrintableHTML(invoiceData)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'confirmed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Confirmé</Badge>
      case 'claimed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Réclamation</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des mouvements...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mouvement de Stock</h1>
          <p className="text-muted-foreground">
            Gérez les envois de marchandises vers les librairies
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter Mouvement de Stock
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Mouvements</p>
                <p className="text-2xl font-bold">{movements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold">
                  {movements.filter(m => m.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmés</p>
                <p className="text-2xl font-bold">
                  {movements.filter(m => m.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Réclamations</p>
                <p className="text-2xl font-bold">
                  {movements.filter(m => m.status === 'claimed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun mouvement trouvé</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                Créer le premier mouvement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Numéro</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Destination</th>
                    <th className="text-left p-2">Responsable</th>
                    <th className="text-left p-2">Montant</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement: any) => (
                    <tr key={movement.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <span className="font-mono text-sm">{movement.movement_number}</span>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">
                            {formatDate(movement.created_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(movement.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">{movement.to_stock_name}</span>
                      </td>
                      <td className="p-2">
                        <span>{movement.recipient_name}</span>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">
                          {formatPrice(movement.total_amount)}
                        </span>
                      </td>
                      <td className="p-2">
                        {getStatusBadge(movement.status)}
                      </td>
                      <td className="p-2">
                          {/* Dépôt cannot confirm/claim movements - only receiving stocks can */}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchMovementDetails(movement.id)}
                            title="Voir les détails"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(movement)}
                            title="Télécharger la facture PDF"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintInvoice(movement)}
                            title="Imprimer la facture"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Movement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter Mouvement de Stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Select
                  value={formData.to_stock_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, to_stock_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une librairie" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockOptions.map((stock) => (
                      <SelectItem key={stock.id} value={stock.value}>
                        {stock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Nom du Responsable *</Label>
                <Input
                  value={formData.recipient_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                  placeholder="Nom de la personne qui recevra les produits"
                />
              </div>
            </div>

            {/* Products */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Produits *</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={startScanning}>
                    <Scan className="h-4 w-4 mr-2" />
                    Scanner un produit
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter Produit
                  </Button>
                </div>
              </div>

              {/* Barcode Scanner Section */}
              <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                isScanning
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scan className={`h-5 w-5 ${isScanning ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className={`text-sm font-medium ${isScanning ? 'text-blue-800' : 'text-gray-700'}`}>
                      {isScanning ? '🔍 Scanner détecté - Scan en cours...' : '🔹 Scannez le code-barres ou sélectionnez un produit manuellement'}
                    </span>
                  </div>

                  {isScanning && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={stopScanning}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Arrêter le scan
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      id="barcode-input"
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={handleBarcodeKeyPress}
                      placeholder={isScanning
                        ? "🔍 Scannez maintenant ou saisissez le code-barres..."
                        : "Saisissez le code-barres ici..."
                      }
                      className={`transition-all duration-200 ${
                        isScanning
                          ? 'ring-2 ring-blue-500 border-blue-500 bg-white'
                          : 'border-gray-300'
                      }`}
                      autoComplete="off"
                    />
                    {barcodeInput && cleanBarcode(barcodeInput) !== barcodeInput && (
                      <div className="text-xs text-blue-600">
                        Code nettoyé: {cleanBarcode(barcodeInput)}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleBarcodeInput(barcodeInput)}
                    disabled={!barcodeInput.trim()}
                    size="sm"
                    variant={isScanning ? "default" : "outline"}
                  >
                    Ajouter
                  </Button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  {isScanning ? (
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      Mode scan activé - Prêt à recevoir les codes-barres
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Cliquez sur "Scanner un produit" pour activer le mode scan
                    </div>
                  )}

                  {formData.items.length > 0 && (
                    <div className="text-xs text-green-600">
                      {formData.items.length} produit(s) ajouté(s)
                    </div>
                  )}
                </div>

                {/* Recently Scanned Products */}
                {recentlyScanned.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-2">Récemment scannés:</div>
                    <div className="flex flex-wrap gap-1">
                      {recentlyScanned.map((productName, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                        >
                          {productName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyboard Shortcuts Info */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    💡 Raccourcis: <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+Shift+S</kbd> pour scanner,
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Échap</kbd> pour arrêter
                  </div>
                </div>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun produit ajouté</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="mt-2"
                  >
                    Ajouter le premier produit
                  </Button>
                </div>
              ) : (
                formData.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-4">
                        <Label>Produit</Label>
                        <Select
                          value={item.product_id ? item.product_id.toString() : "none"}
                          onValueChange={(value) => {
                            if (value === "none") return
                            const product = products.find(p => p.id === parseInt(value))
                            updateItem(index, 'product_id', parseInt(value))
                            updateItem(index, 'product_name', product?.name || '')
                            updateItem(index, 'unit_price', product?.price || 0)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sélectionner un produit</SelectItem>
                            {products.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - Stock: {product.quantity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Prix Unitaire</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-3">
                        <Label>Total</Label>
                        <div className="p-2 bg-muted rounded">
                          {formatPrice(item.quantity * item.unit_price)}
                        </div>
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Label>Notes</Label>
                      <Input
                        value={item.notes}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        placeholder="Notes sur ce produit..."
                      />
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Summary */}
            {formData.items.length > 0 && (
              <Card className="p-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total du Mouvement:</span>
                  <span className="text-xl font-bold">{formatPrice(getTotalAmount())}</span>
                </div>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes Générales</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes additionnelles sur ce mouvement..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateMovement}>
                Créer Mouvement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement Details Dialog */}
      {selectedMovement && (
        <Dialog open={!!selectedMovement} onOpenChange={() => setSelectedMovement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails du Mouvement {selectedMovement.movement_number}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Destination</Label>
                  <p className="font-medium">{selectedMovement.to_stock_name}</p>
                </div>
                <div>
                  <Label>Responsable</Label>
                  <p className="font-medium">{selectedMovement.recipient_name}</p>
                </div>
                <div>
                  <Label>Statut</Label>
                  {getStatusBadge(selectedMovement.status)}
                </div>
                <div>
                  <Label>Montant Total</Label>
                  <p className="font-medium">{formatPrice(selectedMovement.total_amount)}</p>
                </div>
              </div>

              <div>
                <Label>Produits</Label>
                <div className="mt-2 space-y-2">
                  {selectedMovement.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMovement.status === 'claimed' && selectedMovement.claim_message && (
                <div>
                  <Label>Message de Réclamation</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">{selectedMovement.claim_message}</p>
                    {selectedMovement.claim_date && (
                      <p className="text-xs text-red-600 mt-1">
                        {formatDateTime(selectedMovement.claim_date)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedMovement.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 text-sm">{selectedMovement.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
