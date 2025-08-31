const mysql = require('mysql2');

// Configuration de la base de données
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stock'
});

console.log('🔄 Ajout de la colonne barcode à la table sales...\n');

// Connexion à la base de données
connection.connect((err) => {
  if (err) {
    console.error('❌ Erreur de connexion:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connecté à la base de données MySQL');
  
  // Vérifier si la colonne barcode existe déjà
  const checkColumnQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'stock' 
    AND TABLE_NAME = 'sales' 
    AND COLUMN_NAME = 'barcode'
  `;
  
  console.log('🔍 Vérification de l\'existence de la colonne barcode...');
  
  connection.query(checkColumnQuery, (err, results) => {
    if (err) {
      console.error('❌ Erreur lors de la vérification:', err.message);
      connection.end();
      process.exit(1);
    }
    
    if (results.length > 0) {
      console.log('✅ La colonne barcode existe déjà dans la table sales');
      console.log('🎉 Aucune action nécessaire !');
      connection.end();
      return;
    }
    
    // Ajouter la colonne barcode
    const addColumnQuery = `
      ALTER TABLE sales 
      ADD COLUMN barcode VARCHAR(20) NULL 
      AFTER total
    `;
    
    console.log('📋 Ajout de la colonne barcode à la table sales...');
    
    connection.query(addColumnQuery, (err, results) => {
      if (err) {
        console.error('❌ Erreur lors de l\'ajout de la colonne:', err.message);
        connection.end();
        process.exit(1);
      }
      
      console.log('✅ Colonne barcode ajoutée avec succès');
      
      // Ajouter un index sur la colonne barcode pour les recherches rapides
      const addIndexQuery = `
        ALTER TABLE sales 
        ADD INDEX idx_sales_barcode (barcode)
      `;
      
      console.log('📋 Ajout de l\'index sur la colonne barcode...');
      
      connection.query(addIndexQuery, (err, results) => {
        if (err) {
          console.error('⚠️  Erreur lors de l\'ajout de l\'index (non critique):', err.message);
        } else {
          console.log('✅ Index ajouté sur la colonne barcode');
        }
        
        // Vérifier la structure finale
        const describeQuery = 'DESCRIBE sales';
        
        console.log('\n🔍 Vérification de la structure finale de la table sales...');
        
        connection.query(describeQuery, (err, results) => {
          if (err) {
            console.error('❌ Erreur lors de la vérification finale:', err.message);
          } else {
            console.log('📋 Structure de la table sales :');
            console.table(results);
            
            // Vérifier spécifiquement la colonne barcode
            const barcodeColumn = results.find(col => col.Field === 'barcode');
            if (barcodeColumn) {
              console.log('\n✅ Colonne barcode configurée :');
              console.log(`  - Type: ${barcodeColumn.Type}`);
              console.log(`  - Null: ${barcodeColumn.Null}`);
              console.log(`  - Default: ${barcodeColumn.Default || 'NULL'}`);
            }
          }
          
          console.log('\n🎉 SUCCÈS ! La colonne barcode est prête pour les factures !');
          console.log('\n📝 Vous pouvez maintenant:');
          console.log('  1. Générer des factures avec codes-barres depuis la caisse');
          console.log('  2. Sauvegarder automatiquement les codes-barres en base');
          console.log('  3. Rechercher des ventes par code-barres');
          console.log('  4. Utiliser les codes-barres pour les retours');
          
          // Fermer la connexion
          connection.end();
          console.log('\n🔌 Connexion fermée');
        });
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
