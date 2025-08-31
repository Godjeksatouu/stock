const mysql = require('mysql2/promise');

async function updateReturnTables() {
  let connection;
  
  try {
    console.log('🔄 Mise à jour des tables de retours...');
    
    // Connexion à la base de données
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connecté à la base de données MySQL');
    
    // Vérifier la structure actuelle
    const [currentStructure] = await connection.execute('DESCRIBE return_transactions');
    console.log('📋 Structure actuelle de return_transactions:');
    console.table(currentStructure);
    
    // Ajouter les colonnes manquantes une par une
    const columnsToAdd = [
      'ADD COLUMN stock_id INT NOT NULL DEFAULT 1',
      'ADD COLUMN original_sale_id INT NULL',
      'ADD COLUMN user_id INT NULL',
      'ADD COLUMN return_type ENUM("refund", "exchange") NOT NULL DEFAULT "refund"',
      'ADD COLUMN total_refund_amount DECIMAL(10,2) DEFAULT 0.00',
      'ADD COLUMN total_exchange_amount DECIMAL(10,2) DEFAULT 0.00',
      'ADD COLUMN balance_adjustment DECIMAL(10,2) DEFAULT 0.00',
      'ADD COLUMN payment_method ENUM("cash", "card", "check", "credit") DEFAULT "cash"',
      'ADD COLUMN notes TEXT NULL',
      'ADD COLUMN status ENUM("pending", "completed", "cancelled") DEFAULT "pending"',
      'ADD COLUMN processed_at TIMESTAMP NULL'
    ];
    
    for (const column of columnsToAdd) {
      try {
        await connection.execute(`ALTER TABLE return_transactions ${column}`);
        console.log(`✅ Colonne ajoutée: ${column}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️ Colonne déjà existante: ${column}`);
        } else {
          console.error(`❌ Erreur ajout colonne ${column}:`, error.message);
        }
      }
    }
    
    // Mettre à jour return_items si nécessaire
    try {
      await connection.execute(`
        ALTER TABLE return_items 
        ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN reason VARCHAR(255) NULL,
        ADD COLUMN condition_notes TEXT NULL
      `);
      console.log('✅ Colonnes return_items ajoutées');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Colonnes return_items déjà existantes');
      } else {
        console.error('❌ Erreur ajout colonnes return_items:', error.message);
      }
    }
    
    // Vérifier la nouvelle structure
    const [newStructure] = await connection.execute('DESCRIBE return_transactions');
    console.log('\n📋 Nouvelle structure de return_transactions:');
    console.table(newStructure);
    
    console.log('\n🎉 SUCCÈS ! Tables de retours mises à jour !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

updateReturnTables();
