"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Scan, Plus, Minus, Trash2, ShoppingCart, Download, Printer, Eye, CreditCard, Calculator } from "lucide-react"
import { productsApi, salesApi, invoicesApi } from "@/lib/api"
import { formatPrice, getCurrencySymbol } from "@/lib/currency"
import { Product, CartItem, STOCK_MAPPING } from "@/lib/types"
import { generateSimpleTicketHTML, downloadSimpleTicket, printSimpleTicket, generateBarcodeForSale, getStockInfo, SimpleTicketData } from "@/lib/simple-ticket-generator"
import NumericCalculator from "./numeric-calculator"
import { useToast } from "@/hooks/use-toast"

interface CashierSystemProps {
  stockId: string
}

export default function CashierSystem({ stockId }: CashierSystemProps) {
  const { toast } = useToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [barcode, setBarcode] = useState("")
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false)
  const [manualProduct, setManualProduct] = useState({ name: "", price: "", barcode: "" })
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [lastInvoice, setLastInvoice] = useState<string | null>(null)
  const [lastInvoiceData, setLastInvoiceData] = useState<SimpleTicketData | null>(null)

  // États pour la calculatrice et le paiement
  const [activeInput, setActiveInput] = useState<string | null>(null)
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [changeAmount, setChangeAmount] = useState<number>(0)

  // Calculate cart total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.price) * item.cartQuantity, 0)
  }

  // Calculate change amount
  const calculateChange = () => {
    const total = calculateTotal()
    const paid = parseFloat(amountPaid) || 0
    return Math.max(0, paid - total)
  }

  // Update change amount when amount paid changes
  useEffect(() => {
    setChangeAmount(calculateChange())
  }, [amountPaid, cart])

  // Fonctions pour la calculatrice
  const handleCalculatorNumber = (number: string) => {
    if (activeInput === 'amountPaid') {
      setAmountPaid(prev => prev + number)
    } else if (activeInput && activeInput.startsWith('quantity-')) {
      const itemId = parseInt(activeInput.split('-')[1])
      const currentItem = cart.find(item => item.id === itemId)
      if (currentItem) {
        // Si c'est le premier chiffre et que la quantité est 1, remplacer
        if (currentItem.cartQuantity === 1) {
          updateCartQuantity(itemId, parseInt(number))
        } else {
          const currentQuantity = currentItem.cartQuantity.toString()
          const newQuantity = parseInt(currentQuantity + number)
          updateCartQuantity(itemId, newQuantity)
        }
      }
    }
  }

  const handleCalculatorBackspace = () => {
    if (activeInput === 'amountPaid') {
      setAmountPaid(prev => prev.slice(0, -1))
    } else if (activeInput && activeInput.startsWith('quantity-')) {
      const itemId = parseInt(activeInput.split('-')[1])
      const currentItem = cart.find(item => item.id === itemId)
      if (currentItem) {
        const currentQuantity = currentItem.cartQuantity.toString()
        const newQuantity = parseInt(currentQuantity.slice(0, -1)) || 0
        updateCartQuantity(itemId, newQuantity)
      }
    }
  }

  const handleCalculatorClear = () => {
    if (activeInput === 'amountPaid') {
      setAmountPaid("")
    } else if (activeInput && activeInput.startsWith('quantity-')) {
      const itemId = parseInt(activeInput.split('-')[1])
      updateCartQuantity(itemId, 1)
    }
  }

  // Fonction pour vider complètement un champ de quantité
  const clearQuantityField = (itemId: number) => {
    setActiveInput(`quantity-${itemId}`)
    updateCartQuantity(itemId, 0)
  }

  // Use shared cleaner
  const { cleanBarcode } = require('@/lib/barcode')


  const total = calculateTotal()

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode.trim()) return

    try {
      // Clean the barcode input to handle scanner encoding issues
      const cleanedBarcode = cleanBarcode(barcode.trim())
      console.log('Original barcode:', barcode.trim())
      console.log('Cleaned barcode:', cleanedBarcode)

      if (!cleanedBarcode) {
        toast({
          variant: "destructive",
          title: "Code-barres invalide",
          description: "Veuillez scanner ou saisir un code-barres valide"
        })
        setBarcode("")
        return
      }

      // Search by cleaned barcode first
      console.log('Searching by barcode:', cleanedBarcode);
      let result = await productsApi.searchByBarcode(cleanedBarcode)
      console.log('Barcode search result:', result);

      // If not found by barcode, try by reference
      if (!result.success || !result.data) {
        console.log('Searching by reference:', cleanedBarcode);
        result = await productsApi.searchByReference(cleanedBarcode)
        console.log('Reference search result:', result);
      }

      // If still not found, try with original input
      if (!result.success || !result.data) {
        console.log('Searching by original barcode:', barcode.trim());
        result = await productsApi.searchByBarcode(barcode.trim())
        console.log('Original barcode search result:', result);
      }

      if (!result.success || !result.data) {
        console.log('Searching by original reference:', barcode.trim());
        result = await productsApi.searchByReference(barcode.trim())
        console.log('Original reference search result:', result);
      }

      if (result.success && result.data) {
        addToCart(result.data)
        setBarcode("")
      } else {
        // Produit non trouvé, proposer la saisie manuelle
        toast({
          variant: "default",
          title: "Produit non trouvé",
          description: `Code: ${cleanedBarcode} - Ouverture de la saisie manuelle`,
        })
        // Pré-remplir le code-barres dans la saisie manuelle
        setManualProduct({
          name: "",
          price: "",
          barcode: cleanedBarcode // Ajouter le code-barres scanné
        })
        setIsManualDialogOpen(true)
        setBarcode("")
      }
    } catch (error) {
      console.error('Error searching product:', error)
      setIsManualDialogOpen(true)
      setBarcode("")
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id)

    if (existingItem) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item)))
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }])
    }
  }

  const updateCartQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id)
    } else {
      setCart(cart.map((item) => (item.id === id ? { ...item, cartQuantity: newQuantity } : item)))
    }
  }

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  // Fonction de recherche de suggestions pour la saisie manuelle
  const searchProductSuggestions = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/products?stockId=${stockId}&search=${encodeURIComponent(searchTerm)}&limit=5`)
      const result = await response.json()

      if (result.success && result.data?.products) {
        setSearchSuggestions(result.data.products)
      } else {
        setSearchSuggestions([])
      }
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  // Fonction pour sélectionner un produit suggéré
  const selectSuggestedProduct = (product: Product) => {
    setManualProduct({
      name: product.name,
      price: product.price.toString(),
      barcode: product.barcode || product.reference || ""
    })
    setSearchSuggestions([])
  }

  const handleManualAdd = async () => {
    if (manualProduct.name && manualProduct.price) {
      try {
        // Créer le produit en base de données d'abord
        const productData = {
          name: manualProduct.name,
          reference: manualProduct.barcode || `MANUAL-${Date.now()}`,
          barcode: manualProduct.barcode || null,
          price: Number.parseFloat(manualProduct.price),
          quantity: 1, // Quantité initiale
          stockId: stockId
        }

        console.log('🆕 Creating manual product:', productData)

        const response = await fetch(`/api/products?stockId=${stockId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData)
        })

        const result = await response.json()

        if (result.success && result.data) {
          // Utiliser le produit créé en base avec son vrai ID
          addToCart(result.data)

          toast({
            title: "Produit ajouté",
            description: `"${manualProduct.name}" créé et ajouté au panier`,
          })

          setManualProduct({ name: "", price: "", barcode: "" })
          setIsManualDialogOpen(false)
        } else {
          // Si la création échoue, utiliser un produit temporaire
          console.warn('⚠️ Failed to create product in database, using temporary product')

          const tempProduct: Product = {
            id: Date.now(), // ID temporaire
            name: manualProduct.name,
            reference: manualProduct.barcode || `TEMP-${Date.now()}`,
            barcode: manualProduct.barcode || null,
            price: Number.parseFloat(manualProduct.price),
            quantity: 1,
          }

          addToCart(tempProduct)

          toast({
            variant: "default",
            title: "Produit ajouté (temporaire)",
            description: `"${manualProduct.name}" ajouté au panier (non sauvegardé en base)`,
          })

          setManualProduct({ name: "", price: "", barcode: "" })
          setIsManualDialogOpen(false)
        }
      } catch (error) {
        console.error('❌ Error creating manual product:', error)

        // En cas d'erreur, utiliser un produit temporaire
        const tempProduct: Product = {
          id: Date.now(),
          name: manualProduct.name,
          reference: manualProduct.barcode || `TEMP-${Date.now()}`,
          barcode: manualProduct.barcode || null,
          price: Number.parseFloat(manualProduct.price),
          quantity: 1,
        }

        addToCart(tempProduct)

        toast({
          variant: "default",
          title: "Produit ajouté (temporaire)",
          description: `"${manualProduct.name}" ajouté au panier`,
        })

        setManualProduct({ name: "", price: "", barcode: "" })
        setIsManualDialogOpen(false)
      }
    }
  }

  const confirmSale = async () => {
    if (cart.length === 0) return

    try {
      // Get user data from localStorage
      const userData = localStorage.getItem("user")
      if (!userData) {
        toast({
          variant: "destructive",
          title: "Session expirée",
          description: "Veuillez vous reconnecter"
        })
        return
      }

      const user = JSON.parse(userData)
      const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

      if (!stockDbId) {
        toast({
          variant: "destructive",
          title: "Erreur de configuration",
          description: "ID de stock invalide"
        })
        return
      }

      // Create sale with items array
      const totalAmount = parseFloat(total.toFixed(2))
      const paidAmount = parseFloat(amountPaid) || totalAmount
      const changeAmount = Math.max(0, paidAmount - totalAmount)

      const saleItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.cartQuantity,
        unit_price: item.price,
      }))

      const saleData = {
        user_id: user.id,
        stock_id: stockDbId,
        items: saleItems,
        total: totalAmount,
        amount_paid: paidAmount,
        change_amount: changeAmount,
        payment_method: 'cash',
        payment_status: paidAmount >= totalAmount ? 'paid' : 'partial',
        source: 'pos',
        notes: `Vente POS - ${cart.length} article(s) - Caisse`
      }

      console.log('Creating sale with data:', saleData);

      const saleResult = await salesApi.create(saleData)

      if (saleResult.success && saleResult.data) {
        try { window.dispatchEvent(new CustomEvent('sales-updated', { detail: { stockId } })); } catch {}
        // Generate invoice automatically (using simplified API)
        const invoiceResult = await invoicesApi.create({
          reference_id: saleResult.data.id,
          invoice_type: 'sale',
          total_amount: totalAmount,
          subtotal: totalAmount,
          tax_amount: 0,
          stock_id: stockDbId,
          status: 'paid'
        })

        if (invoiceResult.success && invoiceResult.data) {
          setLastInvoice(invoiceResult.data.invoice_number)

          // Generate and download invoice
          await generateAndDownloadInvoice(invoiceResult.data.invoice_number, saleResult.data, user.username)

          // Réinitialiser le panier et les champs de paiement
          setCart([])
          setAmountPaid("")
          setChangeAmount(0)
          setActiveInput(null)

          // Afficher un message de succès avec numéro de facture et montant à rendre
          const changeMsg = changeAmount > 0 ? ` - Montant à rendre: ${formatPrice(changeAmount)}` : ""
          toast({
            title: "Vente confirmée !",
            description: `Facture ${invoiceResult.data.invoice_number} générée automatiquement${changeMsg}`
          })
        } else {
          // Even if invoice fails, sale was successful
          setCart([])
          setAmountPaid("")
          setChangeAmount(0)
          setActiveInput(null)
          toast({
            title: "Vente enregistrée avec succès !",
            description: "Erreur lors de la génération automatique de la facture. Vous pouvez créer la facture manuellement depuis le module Factures.",
            variant: "destructive"
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erreur lors de l'enregistrement de la vente",
          description: saleResult.error || "Erreur inconnue"
        })
      }
    } catch (error) {
      console.error('Error confirming sale:', error)
      toast({
        variant: "destructive",
        title: "Erreur lors de la confirmation de la vente",
        description: "Une erreur inattendue s'est produite"
      })
    }
  }

  const generateAndDownloadInvoice = async (invoiceNumber: string, saleData: any, cashierName: string) => {
    try {
      // Get stock information using the new function
      const currentStockInfo = getStockInfo(stockId)

      // Générer le code-barres pour cette vente
      const barcode = generateBarcodeForSale(saleData.id)

      // Prepare simple ticket data
      const ticketData: SimpleTicketData = {
        id: saleData.id,
        invoiceNumber,
        date: new Date().toLocaleDateString('fr-FR'),
        stockId: stockId,
        customerName: saleData.client_name || 'Client anonyme',
        items: cart.map(item => ({
          product_name: item.name,
          quantity: item.cartQuantity,
          unit_price: item.price,
          total: item.price * item.cartQuantity
        })),
        subtotal: calculateTotal(),
        total: calculateTotal(),
        payment_method: saleData.payment_method || 'cash',
        amount_paid: parseFloat(amountPaid) || 0,
        change: changeAmount,
        barcode: barcode,
        notes: saleData.notes
      }

      // Sauvegarder le code-barres en base de données
      try {
        console.log(`🔄 Sauvegarde du code-barres ${barcode} pour la vente #${saleData.id}...`)

        const barcodeResponse = await fetch(`/api/sales/${saleData.id}/barcode`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ barcode })
        })

        const responseText = await barcodeResponse.text()
        console.log('Réponse de l\'API barcode:', responseText)

        if (!barcodeResponse.ok) {
          console.error('❌ Erreur lors de la sauvegarde du code-barres:', responseText)
          toast({
            variant: "destructive",
            title: "Attention: Code-barres non sauvegardé",
            description: `Le code-barres ${barcode} n'a pas pu être sauvegardé en base de données`
          })
        } else {
          const responseData = JSON.parse(responseText)
          console.log('✅ Code-barres sauvegardé avec succès:', responseData)
        }
      } catch (error) {
        console.error('❌ Erreur réseau lors de la sauvegarde du code-barres:', error)
        toast({
          variant: "destructive",
          title: "Erreur réseau",
          description: `Le code-barres ${barcode} n'a pas pu être sauvegardé. Veuillez contacter l'administrateur.`
        })
      }

      // Store invoice data for later use
      setLastInvoiceData(ticketData)

      // Generate and download simple ticket (format caisse)
      downloadSimpleTicket(ticketData)

      // Show success message
      toast({
        title: "Ticket généré avec succès !",
        description: "Le ticket de caisse a été téléchargé automatiquement"
      })

    } catch (error) {
      console.error('Error generating invoice:', error)
      toast({
        variant: "destructive",
        title: "Erreur lors de la génération de la facture",
        description: "Une erreur s'est produite lors de la génération"
      })
    }
  }

  const downloadInvoice = () => {
    if (lastInvoiceData) {
      downloadSimpleTicket(lastInvoiceData)
      toast({
        title: "Ticket téléchargé",
        description: "Le ticket a été téléchargé avec succès"
      })
    } else {
      toast({
        variant: "destructive",
        title: "Aucun ticket",
        description: "Aucun ticket disponible pour téléchargement"
      })
    }
  }

  const printInvoiceHandler = () => {
    if (lastInvoiceData) {
      printSimpleTicket(lastInvoiceData)
      toast({
        title: "Impression lancée",
        description: "Le ticket a été envoyé à l'imprimante"
      })
    } else {
      toast({
        variant: "destructive",
        title: "Aucun ticket disponible",
        description: "Aucun ticket disponible pour impression"
      })
    }
  }

  const previewInvoice = () => {
    if (lastInvoiceData) {
      const html = generateSimpleTicketHTML(lastInvoiceData)
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(html)
        newWindow.document.close()
        toast({
          title: "Aperçu ouvert",
          description: "L'aperçu du ticket a été ouvert dans un nouvel onglet"
        })
      }
    } else {
      toast({
        variant: "destructive",
        title: "Aucun ticket disponible",
        description: "Aucun ticket disponible pour aperçu"
      })
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Colonne 1: Scanner et Calculatrice */}
      <div className="space-y-6">
        {/* Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Scanner Code-barres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleBarcodeSubmit}>
              <div className="space-y-2">
                <Label htmlFor="barcode">Code-barres / Référence</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scannez ou saisissez la référence"
                    className="flex-1"
                  />
                  {barcode && cleanBarcode(barcode) !== barcode && (
                    <div className="text-xs text-blue-600 mt-1">
                      Code nettoyé: {cleanBarcode(barcode)}
                    </div>
                  )}
                  <Button type="submit">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>

            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  setManualProduct({ name: "", price: "", barcode: "" })
                  setIsManualDialogOpen(true)
                }}
                className="w-full border-dashed border-2 hover:border-blue-500 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit manuellement
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Pour les produits sans code-barres (ex: Hitach)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calculatrice */}
        <NumericCalculator
          onNumberClick={handleCalculatorNumber}
          onBackspace={handleCalculatorBackspace}
          onClear={handleCalculatorClear}
        />

        {activeInput && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="text-sm text-blue-700 text-center">
                {activeInput === 'amountPaid' ?
                  'Calculatrice active pour: Montant payé' :
                  'Calculatrice active pour: Quantité produit'
                }
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Colonne 2: Panier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Panier ({cart.length} article{cart.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Panier vide</p>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.price)} × {item.cartQuantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <div className="relative">
                      <Input
                        type="text"
                        value={item.cartQuantity}
                        onClick={() => setActiveInput(`quantity-${item.id}`)}
                        onFocus={() => setActiveInput(`quantity-${item.id}`)}
                        onDoubleClick={() => clearQuantityField(item.id)}
                        className={`w-16 text-center cursor-pointer ${activeInput === `quantity-${item.id}` ? 'ring-2 ring-blue-500' : ''}`}
                        readOnly
                        title="Cliquez pour utiliser la calculatrice, double-cliquez pour vider"
                      />
                      {activeInput === `quantity-${item.id}` && (
                        <Calculator className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-3 h-3 text-blue-500" />
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total :</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colonne 3: Paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Total à payer :</span>
                  <span className="text-lg font-bold text-blue-600">{formatPrice(total)}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Montant payé ({getCurrencySymbol()})</Label>
                  <div className="relative">
                    <Input
                      id="amountPaid"
                      type="text"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      onClick={() => setActiveInput('amountPaid')}
                      onFocus={() => setActiveInput('amountPaid')}
                      placeholder="Cliquez pour utiliser la calculatrice"
                      className={`${activeInput === 'amountPaid' ? 'ring-2 ring-blue-500' : ''} cursor-pointer`}
                      readOnly
                    />
                    <Calculator className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {activeInput === 'amountPaid' && (
                    <div className="text-xs text-blue-600 text-center">
                      Utilisez la calculatrice pour saisir le montant
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium text-green-800">Montant à rendre :</span>
                  <span className="text-lg font-bold text-green-600">{formatPrice(changeAmount)}</span>
                </div>
              </div>

              <Separator />

              <Button
                onClick={confirmSale}
                className="w-full"
                size="lg"
                disabled={parseFloat(amountPaid) < total}
              >
                Confirmer la vente
              </Button>
            </>
          )}

          {lastInvoice && (
            <div className="space-y-2 mt-4">
              <Separator />
              <div className="text-sm text-center text-muted-foreground">
                Facture {lastInvoice} générée
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={printInvoiceHandler} size="sm">
                  <Printer className="w-3 h-3 mr-1" />
                  Imprimer
                </Button>
                <Button variant="outline" onClick={previewInvoice} size="sm">
                  <Eye className="w-3 h-3 mr-1" />
                  Aperçu
                </Button>
                <Button variant="outline" onClick={downloadInvoice} size="sm">
                  <Download className="w-3 h-3 mr-1" />
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Dialog saisie manuelle amélioré */}
      <Dialog
        open={isManualDialogOpen}
        onOpenChange={(open) => {
          setIsManualDialogOpen(open)
          if (!open) {
            // Reset form when closing
            setManualProduct({ name: "", price: "", barcode: "" })
            setSearchSuggestions([])
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Ajouter un produit manuellement
            </DialogTitle>
            <p className="text-sm text-gray-600">
              {manualProduct.barcode ?
                `Code-barres scanné: ${manualProduct.barcode}` :
                'Saisissez les informations du produit'
              }
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {/* Code-barres (optionnel) */}
            <div>
              <Label htmlFor="manual-barcode">Code-barres (optionnel)</Label>
              <Input
                id="manual-barcode"
                value={manualProduct.barcode}
                onChange={(e) => setManualProduct({ ...manualProduct, barcode: e.target.value })}
                placeholder="Code-barres ou référence"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ce code sera sauvegardé pour les prochaines ventes
              </p>
            </div>

            {/* Nom du produit avec recherche */}
            <div className="relative">
              <Label htmlFor="manual-name">Nom du produit *</Label>
              <Input
                id="manual-name"
                value={manualProduct.name}
                onChange={(e) => {
                  const value = e.target.value
                  setManualProduct({ ...manualProduct, name: value })
                  searchProductSuggestions(value)
                }}
                placeholder="Ex: Hitach, Cahier A4, etc."
                required
              />

              {/* Suggestions de recherche */}
              {(searchSuggestions.length > 0 || isSearching) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      Recherche en cours...
                    </div>
                  ) : (
                    <>
                      <div className="p-2 text-xs text-gray-500 border-b">
                        Produits existants trouvés :
                      </div>
                      {searchSuggestions.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => selectSuggestedProduct(product)}
                          className="w-full p-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {formatPrice(product.price)} • Stock: {product.quantity}
                            {product.barcode && ` • Code: ${product.barcode}`}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Prix */}
            <div>
              <Label htmlFor="manual-price">Prix de vente ({getCurrencySymbol()}) *</Label>
              <Input
                id="manual-price"
                type="number"
                step="0.01"
                min="0"
                value={manualProduct.price}
                onChange={(e) => setManualProduct({ ...manualProduct, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {/* Informations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 mt-0.5">💡</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Ce produit sera :</p>
                  <ul className="text-xs space-y-1">
                    <li>• Ajouté au panier pour cette vente</li>
                    <li>• Sauvegardé en base de données</li>
                    <li>• Disponible pour les prochaines ventes</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setManualProduct({ name: "", price: "", barcode: "" })
                  setIsManualDialogOpen(false)
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleManualAdd}
                className="flex-1"
                disabled={!manualProduct.name || !manualProduct.price}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
