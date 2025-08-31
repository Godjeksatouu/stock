console.log('🔍 Vérification simple des doublons...')

const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function simpleCheck() {
  let connection
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root', 
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock_management'
    })

    console.log('✅ Connecté à la base de données')

    // Compter les produits
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM products')
    console.log(`📦 Total produits: ${count[0].total}`)

    // Chercher les doublons simples
    const [duplicates] = await connection.execute(`
      SELECT name, COUNT(*) as count 
      FROM products 
      GROUP BY name 
      HAVING COUNT(*) > 1 
      ORDER BY count DESC
    `)

    console.log(`🔍 Doublons trouvés: ${duplicates.length}`)
    
    if (duplicates.length > 0) {
      console.log('\nDétails:')
      duplicates.forEach((dup, i) => {
        console.log(`${i+1}. "${dup.name}" - ${dup.count} exemplaires`)
      })
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    if (connection) await connection.end()
  }
}

simpleCheck().catch(console.error)
