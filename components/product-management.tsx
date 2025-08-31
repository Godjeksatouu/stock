"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Package, Scan, CheckCircle, XCircle } from 'lucide-react'
import { formatPrice } from '@/lib/currency'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: number
  name: string
  reference: string
  description?: string
  price: number
  quantity: number
  stock_id: number
  is_active: number
  created_at: string
  updated_at?: string
  barcodes?: string[]
  primaryBarcode?: string
}

interface ProductManagementProps {
  stockId: string
}

export default function ProductManagement({ stockId }: ProductManagementProps) {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Barcode scanner detection
  const [isScanning, setIsScanning] = useState(false)
  const [scanBuffer, setScanBuffer] = useState('')
  const [lastKeyTime, setLastKeyTime] = useState(0)

  // Search feedback states
  const [searchFeedback, setSearchFeedback] = useState<'none' | 'success' | 'error' | 'scanning'>('none')
  const [feedbackTimeout, setFeedbackTimeout] = useState<NodeJS.Timeout | null>(null)

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    barcode: '',
    description: '',
    price: '',
    quantity: ''
  })
  const [isAddFormScanning, setIsAddFormScanning] = useState(false)
  const [addFormScanBuffer, setAddFormScanBuffer] = useState('')
  const [addFormLastKeyTime, setAddFormLastKeyTime] = useState(0)

  // Edit product form state
  const [editProduct, setEditProduct] = useState({
    name: '',
    barcode: '',
    description: '',
    price: '',
    quantity: ''
  })

  const stockNames = {
    'al-ouloum': 'Librairie Al Ouloum',
    'renaissance': 'Librairie La Renaissance',
    'gros': 'Gros (Dépôt général)'
  }

  const fetchProducts = async (page = 1, search = '', isFromScan = false) => {
    try {
      setLoading(true)
      setError(null)

      // Set scanning feedback if this is from a scan
      if (isFromScan) {
        setSearchFeedback('scanning')
      }

      console.log('🔍 Fetching products for stock:', stockId, 'page:', page, 'isFromScan:', isFromScan)

      const params = new URLSearchParams({
        stockId,
        page: page.toString(),
        limit: '25'
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`/api/products?${params}`)
      console.log('📦 API Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('📦 API Response:', result)

      if (result.success && result.data) {
        // Ensure products is always an array
        const productsArray = Array.isArray(result.data.products) ? result.data.products : []

        console.log('📦 Products array:', productsArray.length, 'items')

        setProducts(productsArray)
        setTotalPages(result.data.pagination?.totalPages || 1)
        setTotalProducts(result.data.pagination?.total || 0)
        setCurrentPage(page)

        // Set feedback based on search results if this is from a scan
        if (isFromScan && search.trim()) {
          if (productsArray.length > 0) {
            setSearchFeedbackWithTimeout('success', 2000)
            toast({
              title: "Produit trouvé !",
              description: `${productsArray.length} produit(s) trouvé(s) pour: ${search}`
            })
          } else {
            setSearchFeedbackWithTimeout('error', 3000)
            toast({
              variant: "destructive",
              title: "Aucun produit trouvé",
              description: `Aucun produit ne correspond au code: ${search}`
            })
          }
        }
      } else {
        console.error('❌ API returned error:', result.error)
        setError(result.error || 'Failed to fetch products')
        setProducts([]) // Ensure products is always an array

        if (isFromScan && search.trim()) {
          setSearchFeedbackWithTimeout('error', 3000)
          toast({
            variant: "destructive",
            title: "Erreur de recherche",
            description: result.error || 'Erreur lors de la recherche'
          })
        }
      }
    } catch (err) {
      console.error('❌ Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProducts([]) // Ensure products is always an array

      if (isFromScan && search.trim()) {
        setSearchFeedbackWithTimeout('error', 3000)
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: "Impossible de rechercher le produit"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (stockId) {
      fetchProducts(1, searchTerm)
    }
  }, [stockId])

  const handleSearch = () => {
    // Reset feedback for manual searches
    setSearchFeedback('none')
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout)
      setFeedbackTimeout(null)
    }
    fetchProducts(1, searchTerm)
  }

  // Function to set search feedback with auto-reset
  const setSearchFeedbackWithTimeout = (feedback: 'success' | 'error', duration: number = 3000) => {
    // Clear any existing timeout
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout)
    }

    setSearchFeedback(feedback)

    // Set new timeout to reset feedback
    const timeout = setTimeout(() => {
      setSearchFeedback('none')
      setFeedbackTimeout(null)
    }, duration)

    setFeedbackTimeout(timeout)
  }

  // Auto-search for barcodes (when input looks like a barcode)
  useEffect(() => {
    const trimmedSearch = searchTerm.trim()

    // Auto-search if the input looks like a barcode (numeric and long enough)
    if (trimmedSearch.length >= 8 && /^\d+$/.test(trimmedSearch)) {
      const timeoutId = setTimeout(() => {
        fetchProducts(1, trimmedSearch, true) // true indicates this is likely from a scan/barcode
      }, 500) // Debounce for 500ms

      return () => clearTimeout(timeoutId)
    }
  }, [searchTerm])

  // Barcode scanner detection logic
  const handleKeyDown = (e: KeyboardEvent) => {
    const currentTime = Date.now()
    const timeDiff = currentTime - lastKeyTime

    // If time between keystrokes is very short (< 50ms), it's likely a scanner
    if (timeDiff < 50 && timeDiff > 0) {
      setIsScanning(true)
    }

    // If it's been more than 100ms since last keystroke, reset scanning state
    if (timeDiff > 100) {
      setIsScanning(false)
      setScanBuffer('')
    }

    setLastKeyTime(currentTime)

    // Only process if we're in the search input
    const target = e.target as HTMLElement
    if (target.id === 'product-search-input') {
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

        // Set the search term and trigger search with scan flag
        setSearchTerm(finalCode)
        setTimeout(() => {
          fetchProducts(1, finalCode, true) // true indicates this is from a scan
        }, 100)

        // Show scan feedback
        toast({
          title: "Code-barres scanné",
          description: `Recherche du produit avec le code: ${finalCode}${
            cleanedCode !== rawScannedCode ? ` (nettoyé de: ${rawScannedCode})` : ''
          }`
        })
      }
    }
  }

  // Clean barcode function shared
  const { cleanBarcode } = require('@/lib/barcode')

  // Handle barcode scanning for add form
  const handleAddFormKeyDown = (e: React.KeyboardEvent) => {
    const currentTime = Date.now()
    const timeDiff = currentTime - addFormLastKeyTime

    // If time between keystrokes is very short (< 50ms), it's likely a scanner
    if (timeDiff < 50 && e.key !== 'Enter') {
      setIsAddFormScanning(true)
    }

    // Reset scanning state if too much time has passed
    if (timeDiff > 100) {
      setIsAddFormScanning(false)
      setAddFormScanBuffer('')
    }

    setAddFormLastKeyTime(currentTime)

    // Accumulate characters for potential barcode
    if (e.key.length === 1) {
      setAddFormScanBuffer(prev => prev + e.key)
    }

    // Handle Enter key (scanner typically sends Enter at the end)
    if (e.key === 'Enter' && isAddFormScanning && addFormScanBuffer.length >= 6) {
      e.preventDefault()
      const rawScannedCode = addFormScanBuffer
      const cleanedCode = cleanBarcode(rawScannedCode)
      setAddFormScanBuffer('')
      setIsAddFormScanning(false)

      // Use cleaned code if it's better, otherwise use raw
      const finalCode = cleanedCode.length >= 6 ? cleanedCode : rawScannedCode

      // Set the barcode in the form
      setNewProduct(prev => ({ ...prev, barcode: finalCode }))

      toast({
        title: "Code-barres scanné",
        description: `Code: ${finalCode}`,
        duration: 2000
      })
    }
  }

  // Setup keyboard event listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + S to focus search input for scanning
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        const searchInput = document.getElementById('product-search-input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
          toast({
            title: "Mode scan activé",
            description: "Scannez maintenant votre code-barres"
          })
        }
      }

      // Call the main handler
      handleKeyDown(e)
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [lastKeyTime, isScanning, scanBuffer])

  // Focus search input on component mount
  useEffect(() => {
    const searchInput = document.getElementById('product-search-input')
    if (searchInput) {
      searchInput.focus()
    }
  }, [])

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeout) {
        clearTimeout(feedbackTimeout)
      }
    }
  }, [feedbackTimeout])

  // Reset scan buffer after timeout
  useEffect(() => {
    if (scanBuffer.length > 0) {
      const timeoutId = setTimeout(() => {
        setScanBuffer('')
        setIsScanning(false)
      }, 200) // Reset after 200ms of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [scanBuffer])

  const handleAddProduct = async () => {
    try {
      if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
        toast({
          variant: "destructive",
          title: "Champs requis manquants",
          description: "Le nom, le prix et la quantité sont obligatoires"
        })
        return
      }

      const response = await fetch(`/api/products?stockId=${stockId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          quantity: parseInt(newProduct.quantity),
          barcodes: newProduct.barcode ? [newProduct.barcode] : []
        }),
      })

      const result = await response.json()

      if (result.success) {
        setShowAddDialog(false)
        setNewProduct({ name: '', barcode: '', description: '', price: '', quantity: '' })
        fetchProducts(currentPage, searchTerm) // Refresh the list
        toast({
          title: "Produit ajouté avec succès",
          description: "Le nouveau produit a été ajouté à l'inventaire"
        })
      } else {
        toast({
          variant: "destructive",
          title: "Erreur lors de l'ajout",
          description: result.error || 'Échec de l\'ajout du produit'
        })
      }
    } catch (err) {
      console.error('❌ Error adding product:', err)
      toast({
        variant: "destructive",
        title: "Erreur lors de l'ajout",
        description: "Une erreur inattendue s'est produite"
      })
    }
  }

  const handlePageChange = (page: number) => {
    // Reset feedback when changing pages
    setSearchFeedback('none')
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout)
      setFeedbackTimeout(null)
    }
    fetchProducts(page, searchTerm)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditProduct({
      name: product.name,
      barcode: product.barcodes?.[0] || '',
      description: product.description || '',
      price: product.price.toString(),
      quantity: product.quantity.toString()
    })
    setShowEditDialog(true)
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    try {
      if (!editProduct.name || !editProduct.price || !editProduct.quantity) {
        toast({
          variant: "destructive",
          title: "Champs requis manquants",
          description: "Le nom, le prix et la quantité sont obligatoires"
        })
        return
      }

      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editProduct.name,
          description: editProduct.description,
          price: parseFloat(editProduct.price),
          quantity: parseInt(editProduct.quantity),
          stock_id: editingProduct.stock_id,
          barcodes: editProduct.barcode ? [editProduct.barcode] : []
        }),
      })

      const result = await response.json()

      if (result.success) {
        setShowEditDialog(false)
        setEditingProduct(null)
        setEditProduct({ name: '', barcode: '', description: '', price: '', quantity: '' })
        fetchProducts(currentPage, searchTerm) // Refresh the list
        toast({
          title: "Produit modifié avec succès",
          description: "Les modifications ont été enregistrées"
        })
      } else {
        toast({
          variant: "destructive",
          title: "Erreur lors de la modification",
          description: result.error || 'Échec de la modification du produit'
        })
      }
    } catch (err) {
      console.error('❌ Error updating product:', err)
      toast({
        variant: "destructive",
        title: "Erreur lors de la modification",
        description: "Une erreur inattendue s'est produite"
      })
    }
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteDialog(true)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setShowDeleteDialog(false)
        setProductToDelete(null)
        fetchProducts(currentPage, searchTerm) // Refresh the list
        toast({
          title: "Produit supprimé avec succès",
          description: "Le produit a été retiré de l'inventaire"
        })
      } else {
        toast({
          variant: "destructive",
          title: "Erreur lors de la suppression",
          description: result.error || 'Échec de la suppression du produit'
        })
      }
    } catch (err) {
      console.error('❌ Error deleting product:', err)
      toast({
        variant: "destructive",
        title: "Erreur lors de la suppression",
        description: "Une erreur inattendue s'est produite"
      })
    }
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Gestion des Produits</span>
              <Badge variant="outline">
                {stockNames[stockId as keyof typeof stockNames] || stockId}
              </Badge>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un produit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau produit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du produit *</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Nom du produit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="barcode">Code Barres</Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                        onKeyDown={handleAddFormKeyDown}
                        placeholder="Code barres du produit ou scanner"
                        className={isAddFormScanning ? "border-green-500 bg-green-50" : ""}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddFormScanning(true)
                          document.getElementById('barcode')?.focus()
                        }}
                        title="Activer le mode scan"
                      >
                        📷
                      </Button>
                    </div>
                    {isAddFormScanning && (
                      <p className="text-xs text-green-600 mt-1">
                        Mode scan activé - Scannez votre code-barres
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Description du produit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Prix (DH) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantité *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleAddProduct}>
                      Ajouter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="flex space-x-2 mb-4">
            <div className="flex-1 relative">
              <Input
                id="product-search-input"
                placeholder="Rechercher par nom, référence ou scannez un code-barres..."
                value={searchTerm}
                onChange={(e) => {
                  const inputValue = e.target.value

                  // Check if input looks like French scanner characters and clean it
                  const cleanedValue = cleanBarcode(inputValue)

                  // If cleaning produced a significantly different result, use the cleaned version
                  if (cleanedValue && cleanedValue !== inputValue && cleanedValue.length >= 6) {
                    console.log('🔍 Auto-cleaning scanner input:', { original: inputValue, cleaned: cleanedValue })
                    setSearchTerm(cleanedValue)

                    // Show toast to inform user about the cleaning
                    toast({
                      title: "Code-barres nettoyé",
                      description: `Caractères français convertis : ${cleanedValue}`,
                      duration: 2000
                    })
                  } else {
                    setSearchTerm(inputValue)
                  }

                  // Reset feedback when user starts typing manually
                  if (searchFeedback !== 'none' && searchFeedback !== 'scanning') {
                    setSearchFeedback('none')
                    if (feedbackTimeout) {
                      clearTimeout(feedbackTimeout)
                      setFeedbackTimeout(null)
                    }
                  }
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className={`text-sm pr-10 transition-all duration-300 ${
                  searchFeedback === 'scanning'
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                    : searchFeedback === 'success'
                      ? 'ring-2 ring-green-500 border-green-500 bg-green-50'
                      : searchFeedback === 'error'
                        ? 'ring-2 ring-red-500 border-red-500 bg-red-50'
                        : isScanning
                          ? 'ring-2 ring-yellow-500 border-yellow-500 bg-yellow-50'
                          : searchTerm.trim().length >= 8 && /^\d+$/.test(searchTerm.trim())
                            ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-25'
                            : ''
                }`}
                autoComplete="off"
              />
              {/* Dynamic feedback indicators */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchFeedback === 'scanning' && (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <Scan className="w-4 h-4 text-blue-600 animate-pulse" />
                  </>
                )}
                {searchFeedback === 'success' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </>
                )}
                {searchFeedback === 'error' && (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </>
                )}
                {searchFeedback === 'none' && isScanning && (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <Scan className="w-4 h-4 text-yellow-600 animate-pulse" />
                  </>
                )}
                {searchFeedback === 'none' && !isScanning && searchTerm.trim().length >= 8 && /^\d+$/.test(searchTerm.trim()) && (
                  <Scan className="w-4 h-4 text-blue-500" />
                )}
              </div>

              {/* Affichage du code nettoyé si différent */}
              {searchTerm && cleanBarcode(searchTerm) !== searchTerm && cleanBarcode(searchTerm) && (
                <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                  Code nettoyé: {cleanBarcode(searchTerm)}
                </div>
              )}
            </div>
            <Button onClick={handleSearch} variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Rechercher
            </Button>
            <Button
              onClick={() => {
                const searchInput = document.getElementById('product-search-input') as HTMLInputElement
                if (searchInput) {
                  searchInput.focus()
                  searchInput.select()
                  toast({
                    title: "Mode scan activé",
                    description: "Scannez maintenant votre code-barres"
                  })
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Scan className="w-4 h-4 mr-2" />
              Scanner
            </Button>
          </div>

          {/* Search info and scanning status */}
          {(searchTerm.trim() || isScanning || searchFeedback !== 'none') && (
            <div className="mb-4 text-sm">
              {searchFeedback === 'scanning' ? (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <Scan className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Recherche en cours...</span>
                </div>
              ) : searchFeedback === 'success' ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">✅ Produit trouvé pour : <span className="font-mono">{searchTerm.trim()}</span></span>
                </div>
              ) : searchFeedback === 'error' ? (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">❌ Aucun produit trouvé pour : <span className="font-mono">{searchTerm.trim()}</span></span>
                </div>
              ) : isScanning ? (
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <Scan className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Scan en cours... ({scanBuffer.length} caractères détectés)</span>
                </div>
              ) : searchTerm.trim() && searchTerm.trim().length >= 8 && /^\d+$/.test(searchTerm.trim()) ? (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <Scan className="w-4 h-4" />
                  <span>Recherche par code-barres : <span className="font-mono font-medium">{searchTerm.trim()}</span></span>
                </div>
              ) : searchTerm.trim() ? (
                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <Search className="w-4 h-4" />
                  <span>Recherche par nom/référence : <span className="font-medium">{searchTerm.trim()}</span></span>
                </div>
              ) : null}
            </div>
          )}



          {/* Products Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code Barres</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(products) && products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.primaryBarcode || '-'}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        <Badge variant={product.quantity > 0 ? 'default' : 'destructive'}>
                          {product.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {loading ? 'Chargement...' : 'Aucun produit trouvé'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Affichage de {((currentPage - 1) * 25) + 1} à {Math.min(currentPage * 25, totalProducts)} sur {totalProducts} résultats
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom du produit *</Label>
              <Input
                id="edit-name"
                value={editProduct.name}
                onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                placeholder="Nom du produit"
              />
            </div>
            <div>
              <Label htmlFor="edit-barcode">Code Barres</Label>
              <Input
                id="edit-barcode"
                value={editProduct.barcode}
                onChange={(e) => setEditProduct({ ...editProduct, barcode: e.target.value })}
                placeholder="Code barres du produit"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editProduct.description}
                onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                placeholder="Description du produit"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Prix (DH) *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={editProduct.price}
                onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-quantity">Quantité *</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={editProduct.quantity}
                onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateProduct}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir supprimer le produit "{productToDelete?.name}" ?
              Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDeleteProduct}>
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
