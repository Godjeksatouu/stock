'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Database, Settings, Users, Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground">
            Outils d'administration et de maintenance du système
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Gestion des doublons */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-orange-500" />
              Gestion des doublons
            </CardTitle>
            <CardDescription>
              Identifier et supprimer les produits en double dans la base de données
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Maintenance
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Détecte automatiquement les produits avec des noms identiques et propose un plan de nettoyage sécurisé.
              </p>
              <Link href="/admin/duplicates">
                <Button className="w-full">
                  Gérer les doublons
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Base de données */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Base de données
            </CardTitle>
            <CardDescription>
              Outils de maintenance et d'optimisation de la base de données
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Bientôt disponible
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Sauvegarde, restauration, optimisation et statistiques de la base de données.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Accéder aux outils DB
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gestion des utilisateurs */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Utilisateurs
            </CardTitle>
            <CardDescription>
              Gestion des comptes utilisateurs et des permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Bientôt disponible
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Créer, modifier et supprimer des comptes utilisateurs, gérer les rôles et permissions.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Gérer les utilisateurs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gestion des produits */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Produits
            </CardTitle>
            <CardDescription>
              Outils avancés de gestion des produits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  Bientôt disponible
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Import/export en masse, fusion de produits, gestion des catégories.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Outils produits
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration système */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Configuration
            </CardTitle>
            <CardDescription>
              Paramètres système et configuration globale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                  Bientôt disponible
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Paramètres de l'application, configuration des notifications, thèmes.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700">
            Les outils d'administration peuvent affecter les données de votre système. 
            Assurez-vous d'avoir une sauvegarde récente avant d'effectuer des modifications importantes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
