"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, RefreshCw } from "lucide-react"
import { formatPrice } from "@/lib/currency"
import { STOCK_MAPPING } from "@/lib/types"

interface GainDuJourManagementProps {
  stockId: string
}

interface DailyProfit {
  id: number
  date: string
  total_sales: number
  total_purchases: number
  total_expenses: number
  total_repairs: number
  gross_profit: number
  net_profit: number
  calculated_at: string
}

interface ManualEntry {
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
}

export default function GainDuJourManagement({ stockId }: GainDuJourManagementProps) {
  const [dailyProfits, setDailyProfits] = useState<DailyProfit[]>([])
  const [todayProfit, setTodayProfit] = useState<DailyProfit | null>(null)
  const [loading, setLoading] = useState(true)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [manualEntry, setManualEntry] = useState<ManualEntry>({
    type: 'income',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  useEffect(() => {
    fetchDailyProfits()
    calculateTodayProfit()
  }, [stockId])

  const fetchDailyProfits = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual API
      const mockProfits: DailyProfit[] = [
        {
          id: 1,
          date: '2024-01-31',
          total_sales: 15000,
          total_purchases: 8000,
          total_expenses: 1500,
          total_repairs: 2000,
          gross_profit: 9000,
          net_profit: 7500,
          calculated_at: '2024-01-31T23:59:59Z'
        },
        {
          id: 2,
          date: '2024-01-30',
          total_sales: 12000,
          total_purchases: 6000,
          total_expenses: 1200,
          total_repairs: 1500,
          gross_profit: 7500,
          net_profit: 6300,
          calculated_at: '2024-01-30T23:59:59Z'
        },
        {
          id: 3,
          date: '2024-01-29',
          total_sales: 18000,
          total_purchases: 10000,
          total_expenses: 2000,
          total_repairs: 3000,
          gross_profit: 11000,
          net_profit: 9000,
          calculated_at: '2024-01-29T23:59:59Z'
        }
      ]
      setDailyProfits(mockProfits)
    } catch (error) {
      console.error('Error fetching daily profits:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTodayProfit = async () => {
    try {
      // Simulate real-time calculation
      const today = new Date().toISOString().split('T')[0]
      const todayData: DailyProfit = {
        id: 0,
        date: today,
        total_sales: 8500,
        total_purchases: 4000,
        total_expenses: 800,
        total_repairs: 1200,
        gross_profit: 5700,
        net_profit: 4900,
        calculated_at: new Date().toISOString()
      }
      setTodayProfit(todayData)
    } catch (error) {
      console.error('Error calculating today profit:', error)
    }
  }

  const handleManualEntry = async () => {
    try {
      // This would save to reglement_caisse table
      console.log('Adding manual entry:', manualEntry)
      
      // Update today's profit calculation
      if (todayProfit) {
        const updatedProfit = { ...todayProfit }
        if (manualEntry.type === 'income') {
          updatedProfit.total_sales += manualEntry.amount
          updatedProfit.gross_profit += manualEntry.amount
          updatedProfit.net_profit += manualEntry.amount
        } else {
          updatedProfit.total_expenses += manualEntry.amount
          updatedProfit.net_profit -= manualEntry.amount
        }
        setTodayProfit(updatedProfit)
      }

      setShowManualDialog(false)
      setManualEntry({
        type: 'income',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error adding manual entry:', error)
    }
  }

  const getWeeklyAverage = () => {
    if (dailyProfits.length === 0) return 0
    const total = dailyProfits.reduce((sum, profit) => sum + profit.net_profit, 0)
    return total / dailyProfits.length
  }

  const getMonthlyTotal = () => {
    return dailyProfits.reduce((sum, profit) => sum + profit.net_profit, 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des données de profit...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gain du Jour</h1>
          <p className="text-muted-foreground">
            Consultez les bénéfices quotidiens et analyses de performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={calculateTodayProfit}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculer
          </Button>
          <Button onClick={() => setShowManualDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Entrée Manuelle
          </Button>
        </div>
      </div>

      {/* Today's Profit Card */}
      {todayProfit && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gain d'Aujourd'hui - {new Date(todayProfit.date).toLocaleDateString('fr-FR')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ventes</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPrice(todayProfit.total_sales)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Achats</p>
                <p className="text-xl font-bold text-red-600">
                  {formatPrice(todayProfit.total_purchases)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Dépenses</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatPrice(todayProfit.total_expenses)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Bénéfice Net</p>
                <p className={`text-2xl font-bold ${todayProfit.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(todayProfit.net_profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Moyenne Hebdomadaire</p>
                <p className="text-2xl font-bold">
                  {formatPrice(getWeeklyAverage())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Mensuel</p>
                <p className="text-2xl font-bold">
                  {formatPrice(getMonthlyTotal())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Jours Analysés</p>
                <p className="text-2xl font-bold">{dailyProfits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Profits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Gains</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyProfits.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune donnée de profit trouvée</p>
              <Button 
                onClick={calculateTodayProfit}
                className="mt-4"
              >
                Calculer le profit d'aujourd'hui
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Ventes</th>
                    <th className="text-left p-2">Achats</th>
                    <th className="text-left p-2">Dépenses</th>
                    <th className="text-left p-2">Réparations</th>
                    <th className="text-left p-2">Bénéfice Brut</th>
                    <th className="text-left p-2">Bénéfice Net</th>
                    <th className="text-left p-2">Tendance</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyProfits.map((profit, index) => {
                    const previousProfit = dailyProfits[index + 1]
                    const trend = previousProfit ? profit.net_profit - previousProfit.net_profit : 0
                    
                    return (
                      <tr key={profit.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">
                              {new Date(profit.date).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(profit.calculated_at).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-green-600 font-medium">
                            {formatPrice(profit.total_sales)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-red-600 font-medium">
                            {formatPrice(profit.total_purchases)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-orange-600 font-medium">
                            {formatPrice(profit.total_expenses)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-blue-600 font-medium">
                            {formatPrice(profit.total_repairs)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`font-medium ${profit.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPrice(profit.gross_profit)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`font-bold ${profit.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPrice(profit.net_profit)}
                          </span>
                        </td>
                        <td className="p-2">
                          {trend !== 0 && (
                            <div className="flex items-center gap-1">
                              {trend > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPrice(Math.abs(trend))}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entrée Manuelle de Gain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Type d'Entrée</Label>
              <Select value={manualEntry.type} onValueChange={(value: any) => setManualEntry({ ...manualEntry, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Revenu</SelectItem>
                  <SelectItem value="expense">Dépense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amount">Montant (DH) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={manualEntry.amount}
                onChange={(e) => setManualEntry({ ...manualEntry, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={manualEntry.description}
                onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                placeholder="Description de l'entrée"
              />
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={manualEntry.date}
                onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
              />
            </div>

            <div className="bg-muted p-4 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {manualEntry.type === 'income' ? 'Ajout au gain:' : 'Déduction du gain:'}
                </span>
                <span className={`text-xl font-bold ${manualEntry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {manualEntry.type === 'income' ? '+' : '-'}{formatPrice(manualEntry.amount)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleManualEntry} 
                disabled={!manualEntry.description || manualEntry.amount <= 0}
              >
                Ajouter l'Entrée
              </Button>
              <Button variant="outline" onClick={() => setShowManualDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
