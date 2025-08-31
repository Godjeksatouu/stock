const mysql = require('mysql2');

// Configuration de la base de données
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stock'
});

console.log('🔄 Création directe des tables de retours...\n');

// Connexion à la base de données
connection.connect((err) => {
  if (err) {
    console.error('❌ Erreur de connexion:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connecté à la base de données MySQL');
  
  // Créer la table return_transactions
  const createReturnTransactionsQuery = `
    CREATE TABLE IF NOT EXISTS return_transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      stock_id INT NOT NULL,
      original_sale_id INT NOT NULL,
      user_id INT,
      client_id INT,
      return_type ENUM('refund', 'exchange') NOT NULL,
      total_refund_amount DECIMAL(10,2) DEFAULT 0.00,
      total_exchange_amount DECIMAL(10,2) DEFAULT 0.00,
      balance_adjustment DECIMAL(10,2) DEFAULT 0.00,
      payment_method ENUM('cash', 'card', 'check', 'credit') DEFAULT 'cash',
      notes TEXT,
      status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
      processed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_return_stock (stock_id),
      INDEX idx_return_sale (original_sale_id),
      INDEX idx_return_date (created_at),
      INDEX idx_return_status (status)
    )
  `;
  
  console.log('📋 Création de la table return_transactions...');
  
  connection.query(createReturnTransactionsQuery, (err, results) => {
    if (err) {
      console.error('❌ Erreur lors de la création de return_transactions:', err.message);
      connection.end();
      process.exit(1);
    }
    
    console.log('✅ Table return_transactions créée avec succès');
    
    // Créer la table return_items
    const createReturnItemsQuery = `
      CREATE TABLE IF NOT EXISTS return_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        return_transaction_id INT NOT NULL,
        original_sale_item_id INT,
        product_id INT NOT NULL,
        action_type ENUM('return', 'exchange_out', 'exchange_in') NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255),
        condition_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE,
        INDEX idx_return_item_transaction (return_transaction_id),
        INDEX idx_return_item_product (product_id),
        INDEX idx_return_item_action (action_type)
      )
    `;
    
    console.log('📋 Création de la table return_items...');
    
    connection.query(createReturnItemsQuery, (err, results) => {
      if (err) {
        console.error('❌ Erreur lors de la création de return_items:', err.message);
        connection.end();
        process.exit(1);
      }
      
      console.log('✅ Table return_items créée avec succès');
      
      // Vérifier que les tables ont été créées
      const verifyQuery = `
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'stock' 
        AND TABLE_NAME IN ('return_transactions', 'return_items')
        ORDER BY TABLE_NAME
      `;
      
      console.log('\n🔍 Vérification des tables créées...');
      
      connection.query(verifyQuery, (err, results) => {
        if (err) {
          console.error('❌ Erreur lors de la vérification:', err.message);
        } else {
          console.log('📋 Tables trouvées dans la base de données:');
          results.forEach(table => {
            console.log(`  ✅ ${table.TABLE_NAME}`);
          });
          
          if (results.length === 2) {
            console.log('\n🎉 SUCCÈS ! Les tables de retours ont été créées avec succès !');
            console.log('\n📝 Vous pouvez maintenant:');
            console.log('  1. Tester la création de retours depuis l\'interface');
            console.log('  2. Vérifier la génération automatique des factures');
            console.log('  3. Consulter l\'historique des retours');
            console.log('\n🚀 Le système de retours est maintenant opérationnel !');
          } else {
            console.log('\n⚠️  Attention: Toutes les tables n\'ont pas été créées correctement');
          }
        }
        
        // Fermer la connexion
        connection.end();
        console.log('\n🔌 Connexion fermée');
      });
    });
  });
});

// Gestion des erreurs de connexion
connection.on('error', (err) => {
  console.error('❌ Erreur de connexion MySQL:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Reconnexion...');
  } else {
    throw err;
  }
});
