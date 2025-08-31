import { NextRequest, NextResponse } from 'next/server'
import { getMany, getOne, updateRecord, deleteRecord } from '@/lib/database'

// GET - Identifier les doublons
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Recherche des produits en double...')

    // Requête pour identifier les doublons basés sur le nom
    const findDuplicatesQuery = `
      SELECT
        name,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(id ORDER BY id) as product_ids,
        GROUP_CONCAT(\`reference\` ORDER BY id) as product_references,
        GROUP_CONCAT(price ORDER BY id) as prices,
        GROUP_CONCAT(created_at ORDER BY id) as created_dates
      FROM products
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC, name
    `

    const duplicatesResult = await getMany(findDuplicatesQuery, [])
    
    if (!duplicatesResult.success) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la recherche des doublons' },
        { status: 500 }
      )
    }

    const duplicates = duplicatesResult.data || []

    if (duplicates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun doublon trouvé',
        data: {
          duplicates: [],
          totalGroups: 0,
          totalToDelete: 0,
          salesImpact: []
        }
      })
    }

    // Vérifier les relations avec les ventes
    const productNames = duplicates.map((d: any) => d.name)
    const placeholders = productNames.map(() => '?').join(',')
    
    const checkSalesQuery = `
      SELECT 
        p.name,
        p.id as product_id,
        COUNT(si.id) as sales_count,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        COALESCE(SUM(si.quantity * si.unit_price), 0) as total_revenue
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      WHERE p.name IN (${placeholders})
      GROUP BY p.id, p.name
      ORDER BY p.name, sales_count DESC
    `

    const salesResult = await getMany(checkSalesQuery, productNames)
    const salesData = salesResult.success ? salesResult.data || [] : []

    // Grouper les données de vente par nom de produit
    const salesByProduct: { [key: string]: any[] } = {}
    salesData.forEach((sale: any) => {
      if (!salesByProduct[sale.name]) {
        salesByProduct[sale.name] = []
      }
      salesByProduct[sale.name].push(sale)
    })

    // Préparer le plan de nettoyage
    const cleanupPlan = duplicates.map((group: any) => {
      const ids = group.product_ids.split(',').map((id: string) => parseInt(id))
      const sales = salesByProduct[group.name] || []
      
      // Trouver le produit à conserver (celui avec le plus de ventes, ou le plus ancien)
      let keepId = ids[0] // Par défaut, garder le premier (plus ancien)
      
      if (sales.length > 0) {
        // Garder celui avec le plus de ventes
        const bestSale = sales.reduce((best: any, current: any) => 
          current.sales_count > best.sales_count ? current : best
        )
        keepId = bestSale.product_id
      }
      
      const toDelete = ids.filter(id => id !== keepId)
      const totalSales = sales.reduce((sum: number, s: any) => sum + s.sales_count, 0)
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + s.total_revenue, 0)

      return {
        name: group.name,
        duplicateCount: group.duplicate_count,
        keepId,
        deleteIds: toDelete,
        totalSales,
        totalRevenue,
        salesDetails: sales
      }
    })

    const totalToDelete = duplicates.reduce((sum: number, group: any) => sum + group.duplicate_count - 1, 0)

    return NextResponse.json({
      success: true,
      data: {
        duplicates,
        cleanupPlan,
        totalGroups: duplicates.length,
        totalToDelete,
        salesImpact: salesByProduct
      }
    })

  } catch (error) {
    console.error('Error finding duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la recherche des doublons' },
      { status: 500 }
    )
  }
}

// POST - Nettoyer les doublons
export async function POST(request: NextRequest) {
  try {
    const { cleanupPlan, dryRun = true } = await request.json()

    if (!cleanupPlan || !Array.isArray(cleanupPlan)) {
      return NextResponse.json(
        { success: false, error: 'Plan de nettoyage requis' },
        { status: 400 }
      )
    }

    console.log(`🧹 ${dryRun ? 'SIMULATION' : 'EXÉCUTION'} du nettoyage des doublons...`)

    const results = []

    for (const plan of cleanupPlan) {
      const { name, keepId, deleteIds } = plan

      console.log(`📦 Traitement: "${name}" - Garder ID ${keepId}, Supprimer ${deleteIds.join(', ')}`)

      if (!dryRun) {
        // Étape 1: Transférer toutes les ventes vers le produit à conserver
        for (const deleteId of deleteIds) {
          const transferQuery = `
            UPDATE sale_items 
            SET product_id = ? 
            WHERE product_id = ?
          `
          
          const transferResult = await updateRecord(transferQuery, [keepId, deleteId])
          
          if (!transferResult.success) {
            console.error(`❌ Erreur lors du transfert des ventes pour le produit ${deleteId}`)
            results.push({
              productName: name,
              action: 'transfer_sales',
              productId: deleteId,
              success: false,
              error: 'Erreur lors du transfert des ventes'
            })
            continue
          }

          console.log(`✅ Ventes transférées de ${deleteId} vers ${keepId}`)
          results.push({
            productName: name,
            action: 'transfer_sales',
            fromId: deleteId,
            toId: keepId,
            success: true
          })
        }

        // Étape 2: Supprimer les doublons
        for (const deleteId of deleteIds) {
          const deleteQuery = 'DELETE FROM products WHERE id = ?'
          const deleteResult = await deleteRecord(deleteQuery, [deleteId])
          
          if (!deleteResult.success) {
            console.error(`❌ Erreur lors de la suppression du produit ${deleteId}`)
            results.push({
              productName: name,
              action: 'delete_product',
              productId: deleteId,
              success: false,
              error: 'Erreur lors de la suppression'
            })
            continue
          }

          console.log(`🗑️ Produit ${deleteId} supprimé`)
          results.push({
            productName: name,
            action: 'delete_product',
            productId: deleteId,
            success: true
          })
        }
      } else {
        // Mode simulation
        results.push({
          productName: name,
          action: 'simulation',
          keepId,
          deleteIds,
          message: `Garderait ID ${keepId}, supprimerait ${deleteIds.join(', ')}`
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Simulation terminée' : 'Nettoyage terminé',
      data: {
        dryRun,
        results,
        totalProcessed: cleanupPlan.length
      }
    })

  } catch (error) {
    console.error('Error cleaning duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors du nettoyage' },
      { status: 500 }
    )
  }
}
