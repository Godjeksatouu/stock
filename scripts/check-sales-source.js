const mysql = require('mysql2/promise');

async function checkSalesSource() {
  let connection;
  
  try {
    console.log('🔍 Vérification des sources des ventes...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Vérifier les ventes avec leurs sources
    const [sales] = await connection.execute(`
      SELECT 
        s.id,
        s.notes,
        s.created_at,
        s.stock_id,
        st.name as stock_name,
        CASE
          WHEN s.notes LIKE 'Vente POS%' OR s.notes LIKE '%POS%'
          THEN 'pos'
          ELSE 'manual'
        END as computed_source
      FROM sales s
      LEFT JOIN stocks st ON s.stock_id = st.id
      ORDER BY s.created_at DESC
      LIMIT 20
    `);
    
    console.log('\n📋 Dernières ventes avec sources:');
    console.table(sales.map(sale => ({
      id: sale.id,
      stock: sale.stock_name,
      source: sale.computed_source,
      notes: sale.notes?.substring(0, 50) + (sale.notes?.length > 50 ? '...' : ''),
      date: new Date(sale.created_at).toLocaleString('fr-FR')
    })));
    
    // Statistiques par source
    const [sourceStats] = await connection.execute(`
      SELECT 
        CASE
          WHEN s.notes LIKE 'Vente POS%' OR s.notes LIKE '%POS%'
          THEN 'pos'
          ELSE 'manual'
        END as source,
        COUNT(*) as count,
        SUM(s.total) as total_amount
      FROM sales s
      GROUP BY source
    `);
    
    console.log('\n📊 Statistiques par source:');
    console.table(sourceStats);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

checkSalesSource();
