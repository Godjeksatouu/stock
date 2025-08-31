const mysql = require('mysql2/promise')

async function testDuplicates() {
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

    // Test 1: Vérifier la structure de la table products
    console.log('\n📋 Structure de la table products:')
    const [columns] = await connection.execute('DESCRIBE products')
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`)
    })

    // Test 2: Compter le nombre total de produits
    console.log('\n📊 Statistiques des produits:')
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM products')
    console.log(`  Total de produits: ${countResult[0].total}`)

    // Test 3: Rechercher les doublons par nom (insensible à la casse)
    console.log('\n🔍 Recherche des doublons par nom:')
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
      console.log('  ✅ Aucun doublon trouvé!')
    } else {
      console.log(`  ⚠️  ${duplicates.length} groupe(s) de doublons trouvé(s):`)
      duplicates.forEach((group, index) => {
        console.log(`\n  ${index + 1}. "${group.name}"`)
        console.log(`     - Nombre de doublons: ${group.duplicate_count}`)
        console.log(`     - IDs: ${group.product_ids}`)
      })
    }

    // Test 4: Vérifier les relations avec les ventes
    if (duplicates.length > 0) {
      console.log('\n🔗 Vérification des relations avec les ventes:')
      
      const productNames = duplicates.map(d => d.name)
      const placeholders = productNames.map(() => '?').join(',')
      
      const [salesData] = await connection.execute(`
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
      `, productNames)

      if (salesData.length > 0) {
        console.log('  Produits avec des ventes:')
        salesData.forEach(sale => {
          if (sale.sales_count > 0) {
            console.log(`    - ${sale.name} (ID: ${sale.product_id}): ${sale.sales_count} vente(s), ${sale.total_revenue}€`)
          }
        })
      } else {
        console.log('  ✅ Aucune vente associée aux doublons')
      }
    }

    // Test 5: Afficher quelques exemples de produits
    console.log('\n📦 Exemples de produits dans la base:')
    const [samples] = await connection.execute('SELECT id, name, reference, price FROM products LIMIT 5')
    samples.forEach(product => {
      console.log(`  - ID ${product.id}: "${product.name}" (Ref: ${product.reference || 'N/A'}, Prix: ${product.price || 0}€)`)
    })

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 La table "products" n\'existe pas. Vérifiez votre base de données.')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Impossible de se connecter à la base de données. Vérifiez que MySQL/MariaDB est démarré.')
    }
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Connexion fermée')
    }
  }
}

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' })

testDuplicates()
