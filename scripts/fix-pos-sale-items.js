const mysql = require('mysql2/promise');

async function fixPOSSaleItems() {
  let connection;
  
  try {
    console.log('🔧 Correction des items de la vente POS...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Ajouter les items manquants pour la vente POS (ID 45)
    await connection.execute(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
      VALUES 
        (45, 712, 2, 25.00, 50.00),
        (45, 80, 1, 25.50, 25.50)
    `);
    
    console.log('✅ Items ajoutés à la vente POS');
    
    // Vérifier les items ajoutés
    const [items] = await connection.execute(`
      SELECT 
        si.*,
        p.name as product_name,
        p.reference
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = 45
    `);
    
    console.log('\n📦 Items de la vente POS (ID 45):');
    console.table(items.map(item => ({
      product: item.product_name,
      reference: item.reference,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total_price
    })));
    
    // Vérifier que le total correspond
    const totalItems = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    console.log(`\n💰 Total des items: ${totalItems}€`);
    console.log(`💰 Total de la vente: 75.50€`);
    console.log(`✅ Cohérence: ${totalItems === 75.50 ? 'OK' : 'ERREUR'}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

fixPOSSaleItems();
