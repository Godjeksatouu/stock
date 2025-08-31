// Script pour ajouter la table sale_barcodes et améliorer les ventes
const mysql = require('mysql2/promise');

async function addSaleBarcodesTable() {
  let connection;
  
  try {
    console.log('🔗 Connexion à la base de données...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('✅ Connecté à la base de données');

    // 1. Créer la table sale_barcodes
    console.log('📦 Création de la table sale_barcodes...');
    
    const createSaleBarcodesTable = `
      CREATE TABLE IF NOT EXISTS \`sale_barcodes\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`sale_id\` int(11) NOT NULL,
        \`product_id\` int(11) NOT NULL,
        \`barcode\` varchar(100) NOT NULL,
        \`quantity\` int(11) NOT NULL DEFAULT 1,
        \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (\`id\`),
        KEY \`idx_sale_barcodes_sale\` (\`sale_id\`),
        KEY \`idx_sale_barcodes_product\` (\`product_id\`),
        KEY \`idx_sale_barcodes_barcode\` (\`barcode\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `;

    await connection.execute(createSaleBarcodesTable);
    console.log('✅ Table sale_barcodes créée avec succès');

    // 2. Ajouter les contraintes de clés étrangères
    try {
      await connection.execute(`
        ALTER TABLE \`sale_barcodes\` 
        ADD CONSTRAINT \`sale_barcodes_ibfk_1\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE CASCADE
      `);
      console.log('✅ Contrainte sale_barcodes -> sales ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sale_barcodes -> sales déjà existante ou erreur:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`sale_barcodes\` 
        ADD CONSTRAINT \`sale_barcodes_ibfk_2\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      `);
      console.log('✅ Contrainte sale_barcodes -> products ajoutée');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Contrainte sale_barcodes -> products déjà existante ou erreur:', e.message);
      }
    }

    // 3. Ajouter la colonne invoice_number si elle n'existe pas
    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD COLUMN \`invoice_number\` VARCHAR(50) UNIQUE NULL AFTER \`id\`
      `);
      console.log('✅ Colonne invoice_number ajoutée à sales');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Colonne invoice_number déjà existante ou erreur:', e.message);
      }
    }

    // 4. Ajouter l'index pour invoice_number
    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD INDEX \`idx_sales_invoice_number\` (\`invoice_number\`)
      `);
      console.log('✅ Index invoice_number ajouté');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index invoice_number déjà existant ou erreur:', e.message);
      }
    }

    // 5. Ajouter les colonnes pour les montants détaillés
    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD COLUMN \`amount_paid\` DECIMAL(10,2) NULL AFTER \`total\`
      `);
      console.log('✅ Colonne amount_paid ajoutée à sales');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Colonne amount_paid déjà existante ou erreur:', e.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`sales\` 
        ADD COLUMN \`change_amount\` DECIMAL(10,2) NULL AFTER \`amount_paid\`
      `);
      console.log('✅ Colonne change_amount ajoutée à sales');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Colonne change_amount déjà existante ou erreur:', e.message);
      }
    }

    // 6. Vérifier la structure finale
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'stock' AND TABLE_NAME = 'sales'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📊 Structure finale de la table sales:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    const [saleBarcodeColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'stock' AND TABLE_NAME = 'sale_barcodes'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📊 Structure de la table sale_barcodes:');
    saleBarcodeColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🎉 Toutes les modifications ont été appliquées avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 Connexion fermée');
    }
  }
}

// Exécuter le script
addSaleBarcodesTable();
