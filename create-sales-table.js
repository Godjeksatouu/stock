// Script pour créer les tables sales et sale_items
const mysql = require('mysql2/promise');

async function createSalesTables() {
  let connection;
  
  try {
    // Configuration de la base de données
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔗 Connexion à la base de données établie');

    // Créer la table sales
    const createSalesTable = `
      CREATE TABLE IF NOT EXISTS \`sales\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`user_id\` int(11) DEFAULT NULL,
        \`stock_id\` int(11) DEFAULT NULL,
        \`client_id\` int(11) DEFAULT NULL,
        \`total\` decimal(10,2) NOT NULL DEFAULT 0.00,
        \`barcode\` varchar(20) DEFAULT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
        \`payment_method\` enum('cash','card','check','credit') DEFAULT 'cash',
        \`payment_status\` enum('pending','partial','paid') DEFAULT 'paid',
        \`notes\` text DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sales_user\` (\`user_id\`),
        KEY \`idx_sales_stock\` (\`stock_id\`),
        KEY \`idx_sales_client\` (\`client_id\`),
        KEY \`idx_sales_date\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;

    await connection.execute(createSalesTable);
    console.log('✅ Table sales créée avec succès');

    // Créer la table sale_items
    const createSaleItemsTable = `
      CREATE TABLE IF NOT EXISTS \`sale_items\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`sale_id\` int(11) NOT NULL,
        \`product_id\` int(11) NOT NULL,
        \`quantity\` int(11) NOT NULL,
        \`unit_price\` decimal(10,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sale_items_sale\` (\`sale_id\`),
        KEY \`idx_sale_items_product\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;

    await connection.execute(createSaleItemsTable);
    console.log('✅ Table sale_items créée avec succès');

    // Ajouter les contraintes de clés étrangères si elles n'existent pas
    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD CONSTRAINT \`sales_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      `);
      console.log('✅ Contrainte sales -> users ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sales -> users déjà existante ou erreur:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD CONSTRAINT \`sales_ibfk_2\` FOREIGN KEY (\`stock_id\`) REFERENCES \`stocks\` (\`id\`) ON DELETE SET NULL
      `);
      console.log('✅ Contrainte sales -> stocks ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sales -> stocks déjà existante ou erreur:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD CONSTRAINT \`sales_ibfk_3\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE SET NULL
      `);
      console.log('✅ Contrainte sales -> clients ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sales -> clients déjà existante ou erreur:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`sale_items\` 
        ADD CONSTRAINT \`sale_items_ibfk_1\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE CASCADE
      `);
      console.log('✅ Contrainte sale_items -> sales ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sale_items -> sales déjà existante ou erreur:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`sale_items\` 
        ADD CONSTRAINT \`sale_items_ibfk_2\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      `);
      console.log('✅ Contrainte sale_items -> products ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sale_items -> products déjà existante ou erreur:', e.message);
      }
    }

    // Insérer quelques données de test
    const insertTestData = `
      INSERT IGNORE INTO \`sales\` (\`id\`, \`user_id\`, \`stock_id\`, \`client_id\`, \`total\`, \`barcode\`, \`created_at\`, \`payment_method\`, \`payment_status\`, \`notes\`) VALUES
      (1, 1, 1, NULL, 25.50, NULL, '2025-08-05 10:00:00', 'cash', 'paid', 'Vente test Al Ouloum'),
      (2, 2, 2, NULL, 45.75, NULL, '2025-08-05 11:00:00', 'card', 'paid', 'Vente test Renaissance'),
      (3, 3, 3, NULL, 120.00, NULL, '2025-08-05 12:00:00', 'cash', 'paid', 'Vente test Gros')
    `;

    await connection.execute(insertTestData);
    console.log('✅ Données de test insérées');

    // Vérifier que les tables existent
    const [tables] = await connection.execute("SHOW TABLES LIKE 'sales'");
    const [saleItemsTables] = await connection.execute("SHOW TABLES LIKE 'sale_items'");
    
    console.log('📊 Vérification des tables:');
    console.log('  - Table sales:', tables.length > 0 ? '✅ Existe' : '❌ N\'existe pas');
    console.log('  - Table sale_items:', saleItemsTables.length > 0 ? '✅ Existe' : '❌ N\'existe pas');

    console.log('\n🎉 Configuration des tables de ventes terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 Connexion fermée');
    }
  }
}

createSalesTables();
