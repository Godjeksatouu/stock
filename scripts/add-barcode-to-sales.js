const mysql = require('mysql2/promise');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stock'
};

async function addBarcodeColumn() {
  let connection;
  
  try {
    console.log('🔗 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie');

    // Vérifier si la colonne barcode existe déjà
    console.log('🔍 Vérification de l\'existence de la colonne barcode...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sales' 
      AND COLUMN_NAME = 'barcode'
    `);

    if (columns.length > 0) {
      console.log('✅ La colonne barcode existe déjà dans la table sales');
      console.log('🎉 Aucune action nécessaire !');
      return;
    }

    // Ajouter la colonne barcode
    console.log('📋 Ajout de la colonne barcode à la table sales...');
    await connection.execute(`
      ALTER TABLE sales 
      ADD COLUMN barcode VARCHAR(20) NULL 
      AFTER total
    `);
    console.log('✅ Colonne barcode ajoutée avec succès');

    // Ajouter un index sur la colonne barcode pour les recherches rapides
    console.log('📋 Ajout de l\'index sur la colonne barcode...');
    try {
      await connection.execute(`
        ALTER TABLE sales 
        ADD INDEX idx_sales_barcode (barcode)
      `);
      console.log('✅ Index ajouté sur la colonne barcode');
    } catch (error) {
      console.log('⚠️  Index pourrait déjà exister:', error.message);
    }

    // Vérifier la structure finale
    console.log('\n🔍 Vérification de la structure finale de la table sales...');
    const [structure] = await connection.execute('DESCRIBE sales');
    
    console.log('📋 Structure de la table sales :');
    console.table(structure);

    // Vérifier spécifiquement la colonne barcode
    const barcodeColumn = structure.find(col => col.Field === 'barcode');
    if (barcodeColumn) {
      console.log('\n✅ Colonne barcode configurée :');
      console.log(`  - Type: ${barcodeColumn.Type}`);
      console.log(`  - Null: ${barcodeColumn.Null}`);
      console.log(`  - Default: ${barcodeColumn.Default || 'NULL'}`);
    }

    console.log('\n🎉 Migration terminée avec succès !');
    console.log('📝 La colonne barcode est maintenant disponible pour stocker les codes-barres des ventes.');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter la migration
addBarcodeColumn();
