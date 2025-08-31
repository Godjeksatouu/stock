"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar"
import {
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Truck,
  ShoppingBag,
  FileText,
  Receipt,
  CreditCard,

  TrendingUp,
  LogOut,
  Building2,

  Settings,
  ArrowLeft,
  Crown,
  RotateCcw,
  ArrowRightLeft
} from "lucide-react"


interface EnhancedSidebarProps {
  stockId: string
  userRole: 'admin' | 'caissier' | 'super_admin'
  onLogout: () => void
}

const stockNames = {
  "al-ouloum": "Librairie Al Ouloum",
  renaissance: "Librairie La Renaissance", 
  gros: "Gros (Dépôt général)",
}

// Menu items for caissier role (limited access)
const caissierMenuItems = [
  {
    group: "Système de Caisse",
    items: [
      {
        id: "cashier",
        label: "Caisse POS",
        icon: ShoppingCart,
        path: "/cashier",
        description: "Système de point de vente"
      },
    ]
  }
]

// Function to generate menu items based on stock type
const getStockMenuItems = (stockId: string) => {
  const isDepot = stockId === 'gros'

  return [
  {
    group: "Gestion des Stocks",
    items: [
      {
        id: "products",
        label: "Produits",
        icon: Package,
        path: "/products",
        description: "Gestion des produits et inventaire"
      },
      {
        id: "cashier",
        label: "Caisse POS",
        icon: ShoppingCart,
        path: "/cashier",
        description: "Système de point de vente"
      },
      {
        id: "factures-caisse",
        label: "Factures Caisse",
        icon: Receipt,
        path: "/factures-caisse",
        description: "Historique des factures caisse"
      },
      {
        id: "sales",
        label: "Gestion des Ventes",
        icon: Receipt,
        path: "/sales",
        description: "Recherche et gestion des factures"
      },
      {
        id: "statistics",
        label: "Statistiques",
        icon: BarChart3,
        path: "/statistics",
        description: "Analyses et rapports"
      },
      ...(isDepot ? [{
        id: "stock-movements",
        label: "Mouvement de Stock",
        icon: ArrowRightLeft,
        path: "/stock-movements",
        description: "Gestion des mouvements vers les librairies"
      }] : [{
        id: "received-movements",
        label: "Réceptions",
        icon: ArrowRightLeft,
        path: "/received-movements",
        description: "Mouvements reçus du dépôt"
      }])
    ]
  },
  {
    group: "Relations Commerciales",
    items: [
      {
        id: "clients",
        label: "Clients",
        icon: Users,
        path: "/clients",
        description: "Gestion de la clientèle"
      },
      {
        id: "fournisseurs",
        label: "Fournisseurs",
        icon: Truck,
        path: "/fournisseurs",
        description: "Gestion des fournisseurs"
      },
    ]
  },
  {
    group: "Transactions",
    items: [
      {
        id: "achats",
        label: "Achats",
        icon: ShoppingBag,
        path: "/achats",
        description: "Gestion des achats"
      },
      {
        id: "retour",
        label: "Retour",
        icon: RotateCcw,
        path: "/retour",
        description: "Gestion des retours et échanges"
      },
      {
        id: "factures",
        label: "Factures",
        icon: FileText,
        path: "/factures",
        description: "Gestion des factures"
      },
    ]
  },

  {
    group: "Finances",
    items: [
      {
        id: "cheques",
        label: "Chèques",
        icon: CreditCard,
        path: "/cheques",
        description: "Gestion des chèques"
      },
      {
        id: "gain-du-jour",
        label: "Gain du Jour",
        icon: TrendingUp,
        path: "/gain-du-jour",
        description: "Bénéfices quotidiens"
      },
    ]
  },
  ]
}

// Menu items for super admin dashboard (global view)
const superAdminMenuItems = [
  {
    group: "Vue Globale",
    items: [
      {
        id: "dashboard",
        label: "Tableau de Bord",
        icon: BarChart3,
        path: "",
        description: "Vue d'ensemble de tous les stocks"
      },
      {
        id: "stocks",
        label: "Gestion des Stocks",
        icon: Building2,
        path: "/stocks",
        description: "Gestion des différents stocks"
      },
    ]
  },
  {
    group: "Analyses Globales",
    items: [
      {
        id: "global-products",
        label: "Tous les Produits",
        icon: Package,
        path: "/products",
        description: "Vue globale des produits"
      },
      {
        id: "global-sales",
        label: "Toutes les Ventes",
        icon: ShoppingCart,
        path: "/sales",
        description: "Historique global des ventes"
      },
      {
        id: "global-reports",
        label: "Rapports Globaux",
        icon: FileText,
        path: "/reports",
        description: "Rapports consolidés"
      },
    ]
  },
  {
    group: "Administration",
    items: [
      {
        id: "users",
        label: "Utilisateurs",
        icon: Users,
        path: "/users",
        description: "Gestion des utilisateurs"
      },
      {
        id: "settings",
        label: "Paramètres",
        icon: Settings,
        path: "/settings",
        description: "Configuration système"
      },
    ]
  },
]

export default function EnhancedSidebar({ stockId, userRole, onLogout }: EnhancedSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedStock, setSelectedStock] = useState(stockId)

  // Check if super admin is viewing a stock dashboard
  const isSuperAdminViewingStock = userRole === 'super_admin' && stockId

  const stockName = stockNames[stockId as keyof typeof stockNames] || stockId

  // Choose menu items based on user role and context
  const menuItems = userRole === 'super_admin' && !isSuperAdminViewingStock
    ? superAdminMenuItems
    : userRole === 'caissier'
    ? caissierMenuItems
    : getStockMenuItems(selectedStock)

  const handleNavigation = (path: string) => {
    if (userRole === 'super_admin' && !isSuperAdminViewingStock) {
      router.push(`/dashboard/super-admin${path}`)
    } else {
      router.push(`/dashboard/stock/${selectedStock}${path}`)
    }
  }



  const handleReturnToSuperAdmin = () => {
    // Return to super admin dashboard
    localStorage.removeItem('superadmin_context')
    router.push('/dashboard/super-admin')
  }

  const isActive = (path: string) => {
    if (userRole === 'super_admin' && !isSuperAdminViewingStock) {
      return pathname.includes(path) || (path === "" && pathname === "/dashboard/super-admin")
    }
    return pathname.includes(`/dashboard/stock/${selectedStock}${path}`) ||
           (path === "" && pathname === `/dashboard/stock/${selectedStock}`)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        {isSuperAdminViewingStock && (
          <div className="mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToSuperAdmin}
              className="w-full justify-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour Super Admin
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isSuperAdminViewingStock ? (
            <Crown className="h-6 w-6 text-purple-600" />
          ) : (
            <Building2 className="h-6 w-6" />
          )}
          <div className="flex-1">
            {isSuperAdminViewingStock ? (
              <div>
                <h2 className="font-semibold">{stockName}</h2>
                <p className="text-sm text-muted-foreground">Vue Super Admin</p>
              </div>
            ) : userRole === 'super_admin' ? (
              <div>
                <h2 className="font-semibold">Super Admin</h2>
                <p className="text-sm text-muted-foreground">Accès global</p>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start p-0 h-auto hover:bg-accent/50 transition-colors"
                onClick={() => router.push(`/dashboard/stock/${selectedStock}`)}
              >
                <div className="text-left">
                  <h2 className="font-semibold text-sm">{stockName}</h2>
                </div>
              </Button>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {menuItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.path)}
                      isActive={isActive(item.path)}
                      tooltip={item.description}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button 
          variant="ghost" 
          onClick={onLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
