const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function cleanDuplicates() {
  let connection
  
  try {
    // Configuration de la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock_management'
    })

    console.log('✅ Connexion à la base de données établie')

    // Étape 1: Identifier les doublons
    console.log('\n🔍 Recherche des doublons...')
    const [duplicates] = await connection.execute(`
      SELECT 
        name,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(id ORDER BY id) as product_ids
      FROM products 
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC, name
    `)

    if (duplicates.length === 0) {
      console.log('✅ Aucun doublon trouvé!')
      return
    }

    console.log(`⚠️  ${duplicates.length} groupe(s) de doublons trouvé(s)`)

    // Étape 2: Pour chaque groupe, analyser les ventes
    const cleanupPlan = []
    
    for (const group of duplicates) {
      const ids = group.product_ids.split(',').map(id => parseInt(id))
      console.log(`\n📦 Analyse: "${group.name}" (IDs: ${ids.join(', ')})`)
      
      // Vérifier les ventes pour chaque produit
      const [salesData] = await connection.execute(`
        SELECT 
          p.id,
          COUNT(si.id) as sales_count,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(si.quantity * si.unit_price), 0) as total_revenue
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        WHERE p.id IN (${ids.map(() => '?').join(',')})
        GROUP BY p.id
        ORDER BY sales_count DESC, p.id ASC
      `, ids)

      // Déterminer quel produit garder
      let keepId = ids[0] // Par défaut, garder le plus ancien
      
      if (salesData.length > 0) {
        const bestProduct = salesData.find(s => s.sales_count > 0) || salesData[0]
        keepId = bestProduct.id
        
        console.log(`   Ventes par produit:`)
        salesData.forEach(sale => {
          console.log(`   - ID ${sale.id}: ${sale.sales_count} vente(s), ${sale.total_revenue}€`)
        })
      }
      
      const deleteIds = ids.filter(id => id !== keepId)
      
      console.log(`   ✅ Garder: ID ${keepId}`)
      console.log(`   🗑️  Supprimer: IDs ${deleteIds.join(', ')}`)
      
      cleanupPlan.push({
        name: group.name,
        keepId,
        deleteIds,
        totalSales: salesData.reduce((sum, s) => sum + s.sales_count, 0)
      })
    }

    // Étape 3: Demander confirmation
    console.log('\n📋 PLAN DE NETTOYAGE:')
    console.log('=====================================')
    cleanupPlan.forEach((plan, index) => {
      console.log(`${index + 1}. "${plan.name}"`)
      console.log(`   - Garder ID: ${plan.keepId}`)
      console.log(`   - Supprimer: ${plan.deleteIds.join(', ')}`)
      console.log(`   - Ventes totales: ${plan.totalSales}`)
    })
    
    const totalToDelete = cleanupPlan.reduce((sum, plan) => sum + plan.deleteIds.length, 0)
    console.log(`\n📊 RÉSUMÉ: ${totalToDelete} produit(s) seront supprimé(s)`)
    
    // Pour la sécurité, on fait juste une simulation par défaut
    console.log('\n⚠️  SIMULATION UNIQUEMENT - Aucune suppression réelle effectuée')
    console.log('Pour exécuter le nettoyage réel, modifiez le script et définissez EXECUTE_CLEANUP=true')
    
    const executeCleanup = process.env.EXECUTE_CLEANUP === 'true'
    
    if (executeCleanup) {
      console.log('\n🧹 EXÉCUTION DU NETTOYAGE...')
      
      // Commencer une transaction
      await connection.beginTransaction()
      
      try {
        for (const plan of cleanupPlan) {
          console.log(`\n📦 Traitement: "${plan.name}"`)
          
          // Transférer les ventes vers le produit à conserver
          for (const deleteId of plan.deleteIds) {
            await connection.execute(
              'UPDATE sale_items SET product_id = ? WHERE product_id = ?',
              [plan.keepId, deleteId]
            )
            console.log(`   ✅ Ventes transférées de ${deleteId} vers ${plan.keepId}`)
          }
          
          // Supprimer les doublons
          for (const deleteId of plan.deleteIds) {
            await connection.execute('DELETE FROM products WHERE id = ?', [deleteId])
            console.log(`   🗑️  Produit ${deleteId} supprimé`)
          }
        }
        
        // Valider la transaction
        await connection.commit()
        console.log('\n✅ NETTOYAGE TERMINÉ AVEC SUCCÈS!')
        
      } catch (error) {
        // Annuler la transaction en cas d'erreur
        await connection.rollback()
        console.error('\n❌ ERREUR - Transaction annulée:', error.message)
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Connexion fermée')
    }
  }
}

cleanDuplicates()
