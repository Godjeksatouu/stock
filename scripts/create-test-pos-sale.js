const mysql = require('mysql2/promise');

async function createTestPOSSale() {
  let connection;
  
  try {
    console.log('🛒 Création d\'une vente POS de test...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Créer une vente POS de test
    const [result] = await connection.execute(`
      INSERT INTO sales (
        invoice_number,
        barcode,
        client_id,
        total,
        amount_paid,
        change_amount,
        payment_method,
        payment_status,
        notes,
        stock_id,
        created_at
      ) VALUES (
        'INV-POS-001',
        '20250809000045',
        2,
        75.50,
        80.00,
        4.50,
        'cash',
        'paid',
        'Vente POS - Test de facture caisse',
        2,
        NOW()
      )
    `);
    
    const saleId = result.insertId;
    console.log(`✅ Vente POS créée avec l'ID: ${saleId}`);
    
    // Ajouter des items de vente
    await connection.execute(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
      VALUES
        (?, 712, 2, 25.00, 50.00),
        (?, 80, 1, 25.50, 25.50)
    `, [saleId, saleId]);
    
    console.log('✅ Items de vente ajoutés');
    
    // Vérifier la vente créée
    const [saleData] = await connection.execute(`
      SELECT 
        s.*,
        CASE
          WHEN s.notes LIKE 'Vente POS%' OR s.notes LIKE '%POS%'
          THEN 'pos'
          ELSE 'manual'
        END as computed_source
      FROM sales s 
      WHERE s.id = ?
    `, [saleId]);
    
    console.log('\n📋 Vente POS créée:');
    console.table(saleData);
    
    return saleId;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

createTestPOSSale();
