"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Crown, Package, ArrowLeft, CreditCard, User } from "lucide-react"
import { authApi } from "@/lib/api"
import { STOCK_MAPPING } from "@/lib/types"

const stockInfo = {
  "al-ouloum": {
    name: "Librairie Al Ouloum",
    icon: BookOpen,
    color: "bg-blue-500",
  },
  renaissance: {
    name: "Librairie La Renaissance",
    icon: BookOpen,
    color: "bg-green-500",
  },
  gros: {
    name: "Gros (Dépôt général)",
    icon: Package,
    color: "bg-orange-500",
  },
  "super-admin": {
    name: "Super Admin",
    icon: Crown,
    color: "bg-purple-500",
  },
}

// Stock configuration
const stockConfig = {
  "al-ouloum": { name: "Librairie Al Ouloum", color: "blue" },
  renaissance: { name: "Librairie La Renaissance", color: "green" },
  gros: { name: "Gros (Dépôt général)", color: "orange" },
  "super-admin": { name: "Super Administrateur", color: "purple" }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stockId = searchParams.get("stock") as keyof typeof stockInfo
  const userType = searchParams.get("type") as "admin" | "cashier"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState<"admin" | "cashier">(userType || "admin")

  // Removed auto-fill functionality - fields should be empty by default
  // useEffect(() => {
  //   if (stockId && stockCredentials[stockId]) {
  //     const userData = stockCredentials[stockId][selectedUserType]
  //     if (userData) {
  //       setEmail(userData.email)
  //       setPassword(userData.password)
  //     }
  //   }
  // }, [stockId, selectedUserType])

  // Redirection si stockId invalide
  useEffect(() => {
    if (!stockId || !stockInfo[stockId]) {
      router.push("/")
    }
  }, [stockId, router])

  // Ne pas rendre le composant si stockId invalide
  if (!stockId || !stockInfo[stockId]) {
    return null
  }

  const stock = stockInfo[stockId]
  const IconComponent = stock.icon

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await authApi.login({
        email,
        password,
        stockId,
      })

      if (result.success && result.data) {
        const stockDbId = stockId !== "super-admin" ? STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING] : null

        const userSession = {
          id: result.data.user.id,
          email: result.data.user.email,
          username: result.data.user.username,
          role: result.data.user.role,
          stockId: stockDbId,
        }

        console.log('💾 Storing user session:', userSession)
        localStorage.setItem("user", JSON.stringify(userSession))

        // Redirect based on role
        if (result.data.user.role === "superadmin") {
          router.push("/dashboard/super-admin")
        } else if (result.data.user.role === "caissier" || result.data.user.role === "cashier") {
          // Cashier goes directly to their stock's cashier system
          router.push(`/dashboard/stock/${stockId}/cashier`)
        } else {
          // Admin goes to main dashboard
          router.push(`/dashboard/stock/${stockId}`)
        }
      } else {
        setError(result.error || "Erreur de connexion")
      }
    } catch (error) {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className={`w-16 h-16 ${stock.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">{stock.name}</CardTitle>
            <p className="text-gray-600">
              Connectez-vous à votre espace
            </p>
          </CardHeader>

          <CardContent>
            {/* User Type Selection for non-superadmin stocks */}
            {stockId !== "super-admin" && (
              <div className="mb-4">
                <Label>Type de compte</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={selectedUserType === "admin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedUserType("admin")}
                    className="flex-1"
                  >
                    <User className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={selectedUserType === "cashier" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedUserType("cashier")}
                    className="flex-1"
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Caissier
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
