"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Crown, Package, CreditCard, ArrowRight, User } from "lucide-react"
import HydrationSafe from "@/components/hydration-safe"

const stockOptions = [
  {
    id: "al-ouloum",
    name: "Librairie Al Ouloum",
    description: "Gestion complète du stock Al Ouloum",
    icon: BookOpen,
    color: "bg-blue-500",
    hoverColor: "hover:bg-blue-600",
    hasCashier: true,
  },
  {
    id: "renaissance",
    name: "Librairie La Renaissance",
    description: "Gestion complète du stock Renaissance",
    icon: BookOpen,
    color: "bg-green-500",
    hoverColor: "hover:bg-green-600",
    hasCashier: true,
  },
  {
    id: "gros",
    name: "Gros (Dépôt général)",
    description: "Gestion du dépôt général",
    icon: Package,
    color: "bg-orange-500",
    hoverColor: "hover:bg-orange-600",
    hasCashier: true,
  },
  {
    id: "super-admin",
    name: "Super Admin",
    description: "Interface d'administration globale",
    icon: Crown,
    color: "bg-purple-500",
    hoverColor: "hover:bg-purple-600",
    hasCashier: false,
  },
]

export default function HomePage() {
  const router = useRouter()

  const handleStockSelect = (stockId: string, userType: "admin" | "cashier" = "admin") => {
    if (userType === "cashier") {
      router.push(`/login?stock=${stockId}&type=cashier`)
    } else {
      router.push(`/login?stock=${stockId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4" suppressHydrationWarning>
      <div className="max-w-6xl mx-auto" suppressHydrationWarning>
        <div className="text-center mb-12 pt-8" suppressHydrationWarning>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Système de Gestion des Stocks
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choisissez votre interface de connexion pour accéder au système de gestion
          </p>
        </div>

        <HydrationSafe
          fallback={
            <div className="text-center">
              <p className="text-xl text-gray-600">Chargement...</p>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto" suppressHydrationWarning>
            {stockOptions.map((stock) => {
              const IconComponent = stock.icon
              return (
                <Card
                  key={stock.id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-gray-300"
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 ${stock.color} rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${stock.hoverColor}`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">{stock.name}</CardTitle>
                    <p className="text-gray-600 text-sm">{stock.description}</p>
                  </CardHeader>
                  <CardContent className="text-center space-y-3">
                    {/* Admin Button */}
                    <Button
                      className={`w-full ${stock.color} ${stock.hoverColor} text-white`}
                      onClick={() => handleStockSelect(stock.id, "admin")}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {stock.id === "super-admin" ? "Super Admin" : "Administrateur"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    {/* Cashier Button (only for stocks with cashier) */}
                    {stock.hasCashier && (
                      <Button
                        variant="outline"
                        className="w-full border-2 hover:bg-teal-50 hover:border-teal-300"
                        onClick={() => handleStockSelect(stock.id, "cashier")}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Caissier
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </HydrationSafe>
      </div>
    </div>
  )
}
