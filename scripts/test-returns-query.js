const mysql = require('mysql2/promise');

async function testReturnsQuery() {
  let connection;
  
  try {
    console.log('🔍 Test de la requête des retours...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Test de la requête exacte utilisée par l'API
    const stockId = 2; // renaissance
    
    const countQuery = `
      SELECT COUNT(DISTINCT rt.id) as total
      FROM return_transactions rt
      LEFT JOIN sales s ON rt.original_sale_id = s.id
      LEFT JOIN clients c ON rt.client_id = c.id
      WHERE s.stock_id = ?
    `;
    
    console.log('🔍 Test de la requête de comptage...');
    console.log('Query:', countQuery);
    console.log('Params:', [stockId]);
    
    const [countRows] = await connection.execute(countQuery, [stockId]);
    console.log('📊 Résultat du comptage:', countRows);
    
    // Test de la requête principale
    const returnsQuery = `
      SELECT
        rt.id,
        rt.original_sale_id,
        rt.client_id,
        COALESCE(c.name, 'Client anonyme') as client_name,
        rt.return_type,
        rt.total_amount,
        rt.total_refund_amount,
        rt.total_exchange_amount,
        rt.payment_method,
        rt.status,
        rt.notes,
        rt.created_at,
        rt.processed_at,
        s.total as original_sale_total,
        u.username as user_name
      FROM return_transactions rt
      LEFT JOIN sales s ON rt.original_sale_id = s.id
      LEFT JOIN clients c ON rt.client_id = c.id
      LEFT JOIN users u ON rt.user_id = u.id
      WHERE s.stock_id = ?
      ORDER BY rt.created_at DESC
      LIMIT 25 OFFSET 0
    `;
    
    console.log('\n🔍 Test de la requête principale...');
    console.log('Query:', returnsQuery);
    console.log('Params:', [stockId]);
    
    const [returnsRows] = await connection.execute(returnsQuery, [stockId]);
    console.log('📋 Résultat des retours:', returnsRows);
    
    // Test sans filtre de stock pour voir tous les retours
    const allReturnsQuery = `
      SELECT
        rt.id,
        rt.stock_id,
        rt.original_sale_id,
        rt.client_id,
        rt.return_type,
        rt.total_amount,
        rt.status,
        s.stock_id as sale_stock_id
      FROM return_transactions rt
      LEFT JOIN sales s ON rt.original_sale_id = s.id
      ORDER BY rt.created_at DESC
    `;
    
    console.log('\n🔍 Test sans filtre de stock...');
    const [allReturns] = await connection.execute(allReturnsQuery);
    console.log('📋 Tous les retours:');
    console.table(allReturns);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

testReturnsQuery();
