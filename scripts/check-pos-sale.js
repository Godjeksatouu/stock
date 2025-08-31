const mysql = require('mysql2/promise');

async function checkPOSSale() {
  let connection;
  
  try {
    console.log('🔍 Vérification de la vente POS...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Vérifier la vente POS
    const [posData] = await connection.execute(`
      SELECT 
        s.*,
        CASE
          WHEN s.notes LIKE 'Vente POS%' OR s.notes LIKE '%POS%'
          THEN 'pos'
          ELSE 'manual'
        END as computed_source
      FROM sales s 
      WHERE s.invoice_number = 'INV-POS-001' OR s.notes LIKE '%POS%'
      ORDER BY s.created_at DESC
    `);
    
    console.log('\n📋 Vente(s) POS trouvée(s):');
    console.table(posData.map(sale => ({
      id: sale.id,
      invoice: sale.invoice_number,
      source: sale.computed_source,
      total: sale.total,
      notes: sale.notes,
      date: new Date(sale.created_at).toLocaleString('fr-FR')
    })));
    
    // Statistiques mises à jour
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
    
    console.log('\n📊 Statistiques par source (mises à jour):');
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

checkPOSSale();
