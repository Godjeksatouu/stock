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
        {/* Meta tags to help prevent browser extension interference */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no" />
        {/* Early script to prevent browser extension hydration issues */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Early cleanup of browser extension attributes
              (function() {
                const cleanup = () => {
                  const attrs = ['bis_skin_checked', 'data-lastpass-icon-root', 'data-1p-ignore', 'data-bitwarden-watching'];
                  attrs.forEach(attr => {
                    document.querySelectorAll('[' + attr + ']').forEach(el => el.removeAttribute(attr));
                  });
                };
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', cleanup);
                } else {
                  cleanup();
                }
                // Also run cleanup periodically
                setInterval(cleanup, 1000);
              })();
            `
          }}
        />
        {/* Scripts moved to ClientScripts component to avoid hydration issues */}
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <div suppressHydrationWarning={true}>
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
