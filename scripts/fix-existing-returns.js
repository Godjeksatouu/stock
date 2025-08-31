const mysql = require('mysql2/promise');

async function fixExistingReturns() {
  let connection;
  
  try {
    console.log('🔧 Correction des retours existants...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Mettre à jour les retours 7 et 8 qui étaient liés à la vente 43 (stock renaissance = 2)
    await connection.execute(`
      UPDATE return_transactions 
      SET 
        original_sale_id = 43,
        stock_id = 2,
        total_refund_amount = total_amount,
        return_type = 'refund',
        payment_method = 'cash',
        status = 'pending'
      WHERE id IN (7, 8)
    `);
    
    console.log('✅ Retours 7 et 8 mis à jour avec original_sale_id = 43 et stock_id = 2');
    
    // Vérifier les retours mis à jour
    const [updatedReturns] = await connection.execute(`
      SELECT 
        rt.*,
        s.stock_id as sale_stock_id,
        s.total as sale_total
      FROM return_transactions rt
      LEFT JOIN sales s ON rt.original_sale_id = s.id
      WHERE rt.id IN (7, 8)
    `);
    
    console.log('\n📋 Retours mis à jour:');
    console.table(updatedReturns);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

fixExistingReturns();
