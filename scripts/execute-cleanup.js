console.log('🧹 Script de nettoyage des doublons')
console.log('=====================================')

const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function executeCleanup() {
  let connection
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root', 
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock_management'
    })

    console.log('✅ Connecté à la base de données')

    // Étape 1: Identifier les doublons avec leurs IDs
    console.log('\n🔍 Identification des doublons...')
    const [duplicates] = await connection.execute(`
      SELECT 
        name,
        COUNT(*) as count,
        GROUP_CONCAT(id ORDER BY id) as ids
      FROM products 
      GROUP BY name 
      HAVING COUNT(*) > 1 
      ORDER BY count DESC, name
    `)

    console.log(`📊 ${duplicates.length} groupes de doublons trouvés`)

    let totalDeleted = 0
    let totalTransferred = 0

    // Commencer une transaction pour la sécurité
    await connection.beginTransaction()

    try {
      // Étape 2: Traiter chaque groupe de doublons
      for (let i = 0; i < duplicates.length; i++) {
        const group = duplicates[i]
        const ids = group.ids.split(',').map(id => parseInt(id))
        const keepId = ids[0] // Garder le premier (plus ancien)
        const deleteIds = ids.slice(1) // Supprimer les autres

        console.log(`\n📦 ${i+1}/${duplicates.length}: "${group.name}"`)
        console.log(`   IDs: ${ids.join(', ')} → Garder ${keepId}, Supprimer ${deleteIds.join(', ')}`)

        // Vérifier s'il y a des ventes associées aux produits à supprimer
        if (deleteIds.length > 0) {
          const [salesCheck] = await connection.execute(`
            SELECT product_id, COUNT(*) as sales_count 
            FROM sale_items 
            WHERE product_id IN (${deleteIds.map(() => '?').join(',')})
            GROUP BY product_id
          `, deleteIds)

          if (salesCheck.length > 0) {
            console.log(`   📈 Ventes trouvées:`)
            salesCheck.forEach(sale => {
              console.log(`      - Produit ${sale.product_id}: ${sale.sales_count} vente(s)`)
            })

            // Transférer les ventes vers le produit à conserver
            for (const deleteId of deleteIds) {
              const [transferResult] = await connection.execute(`
                UPDATE sale_items 
                SET product_id = ? 
                WHERE product_id = ?
              `, [keepId, deleteId])

              if (transferResult.affectedRows > 0) {
                console.log(`   ✅ ${transferResult.affectedRows} vente(s) transférée(s) de ${deleteId} vers ${keepId}`)
                totalTransferred += transferResult.affectedRows
              }
            }
          }

          // Supprimer les produits en double
          for (const deleteId of deleteIds) {
            const [deleteResult] = await connection.execute(`
              DELETE FROM products WHERE id = ?
            `, [deleteId])

            if (deleteResult.affectedRows > 0) {
              console.log(`   🗑️  Produit ${deleteId} supprimé`)
              totalDeleted++
            }
          }
        }
      }

      // Valider la transaction
      await connection.commit()
      
      console.log('\n✅ NETTOYAGE TERMINÉ AVEC SUCCÈS!')
      console.log(`📊 Résumé:`)
      console.log(`   - Produits supprimés: ${totalDeleted}`)
      console.log(`   - Ventes transférées: ${totalTransferred}`)
      console.log(`   - Groupes traités: ${duplicates.length}`)

      // Vérification finale
      const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM products')
      console.log(`   - Produits restants: ${finalCount[0].total}`)

      // Vérifier qu'il n'y a plus de doublons
      const [remainingDuplicates] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM (
          SELECT name 
          FROM products 
          GROUP BY name 
          HAVING COUNT(*) > 1
        ) as dups
      `)
      
      console.log(`   - Doublons restants: ${remainingDuplicates[0].count}`)

    } catch (error) {
      // Annuler la transaction en cas d'erreur
      await connection.rollback()
      console.error('\n❌ ERREUR - Transaction annulée:', error.message)
      throw error
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

// Vérification de sécurité
const args = process.argv.slice(2)
if (args.includes('--execute')) {
  console.log('⚠️  MODE EXÉCUTION ACTIVÉ')
  executeCleanup().catch(console.error)
} else {
  console.log('⚠️  MODE SIMULATION')
  console.log('Pour exécuter réellement le nettoyage, utilisez: node scripts/execute-cleanup.js --execute')
  console.log('ATTENTION: Cette opération est irréversible!')
}
