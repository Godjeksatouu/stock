const mysql = require('mysql2/promise');

async function checkReturnsData() {
  let connection;
  
  try {
    console.log('🔍 Vérification des données de retours...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Vérifier les retours existants
    const [returns] = await connection.execute(`
      SELECT 
        rt.*,
        s.stock_id as sale_stock_id,
        s.total as sale_total
      FROM return_transactions rt
      LEFT JOIN sales s ON rt.original_sale_id = s.id
      ORDER BY rt.created_at DESC
    `);
    
    console.log('\n📋 Retours dans la base de données:');
    console.table(returns);
    
    // Vérifier les items de retour
    const [returnItems] = await connection.execute(`
      SELECT ri.*, p.name as product_name
      FROM return_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      ORDER BY ri.created_at DESC
    `);
    
    console.log('\n📦 Items de retour:');
    console.table(returnItems);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

checkReturnsData();
