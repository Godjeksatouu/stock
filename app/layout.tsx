import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientScripts from "./components/ClientScripts"
import { Toaster } from "@/components/ui/toaster"
import CashierRouteGuard from "@/components/cashier-route-guard"
import HydrationSafe from "@/components/hydration-safe"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Système de Gestion des Stocks",
  description: "Application complète pour la gestion de stocks multi-magasins",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Scripts moved to ClientScripts component to avoid hydration issues */}
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <div suppressHydrationWarning>
          <ClientScripts />
          <CashierRouteGuard>
            {children}
          </CashierRouteGuard>
          <HydrationSafe>
            <Toaster />
          </HydrationSafe>
        </div>
      </body>
    </html>
  )
}
