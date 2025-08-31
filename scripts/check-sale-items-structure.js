const mysql = require('mysql2/promise');

async function checkSaleItemsStructure() {
  let connection;
  
  try {
    console.log('🔍 Vérification de la structure de sale_items...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données');
    
    // Vérifier la structure de la table sale_items
    const [structure] = await connection.execute('DESCRIBE sale_items');
    
    console.log('\n📋 Structure de la table sale_items:');
    console.table(structure);
    
    // Vérifier quelques exemples d'items existants
    const [items] = await connection.execute(`
      SELECT * FROM sale_items 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📦 Exemples d\'items de vente:');
    console.table(items);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

checkSaleItemsStructure();
