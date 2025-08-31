const mysql = require('mysql2/promise');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stock'
};

async function diagnoseBarcodeIssue() {
  let connection;
  
  try {
    console.log('🔗 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie\n');

    // 1. Vérifier si la colonne barcode existe
    console.log('🔍 1. Vérification de la colonne barcode...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sales' 
      AND COLUMN_NAME = 'barcode'
    `);

    if (columns.length === 0) {
      console.log('❌ La colonne barcode n\'existe PAS dans la table sales');
      console.log('📋 Ajout de la colonne barcode...');
      
      await connection.execute(`
        ALTER TABLE sales 
        ADD COLUMN barcode VARCHAR(20) NULL 
        AFTER total
      `);
      console.log('✅ Colonne barcode ajoutée');

      // Ajouter l'index
      try {
        await connection.execute(`
          ALTER TABLE sales 
          ADD INDEX idx_sales_barcode (barcode)
        `);
        console.log('✅ Index ajouté sur la colonne barcode');
      } catch (error) {
        console.log('⚠️  Index pourrait déjà exister:', error.message);
      }
    } else {
      console.log('✅ La colonne barcode existe');
      console.table(columns);
    }

    // 2. Vérifier la structure complète de la table sales
    console.log('\n🔍 2. Structure complète de la table sales...');
    const [structure] = await connection.execute('DESCRIBE sales');
    console.table(structure);

    // 3. Vérifier les ventes récentes et leurs codes-barres
    console.log('\n🔍 3. Vérification des ventes récentes...');
    const [recentSales] = await connection.execute(`
      SELECT id, total, barcode, created_at 
      FROM sales 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('📋 10 ventes les plus récentes :');
    console.table(recentSales);

    // 4. Compter les ventes avec et sans code-barres
    console.log('\n🔍 4. Statistiques des codes-barres...');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_sales,
        COUNT(barcode) as sales_with_barcode,
        COUNT(*) - COUNT(barcode) as sales_without_barcode
      FROM sales
    `);
    
    console.log('📊 Statistiques :');
    console.table(stats);

    // 5. Tester l'API de mise à jour des codes-barres
    console.log('\n🔍 5. Test de génération de code-barres pour les ventes sans code-barres...');
    const [salesWithoutBarcode] = await connection.execute(`
      SELECT id, created_at 
      FROM sales 
      WHERE barcode IS NULL 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (salesWithoutBarcode.length > 0) {
      console.log(`📋 ${salesWithoutBarcode.length} ventes trouvées sans code-barres`);
      
      for (const sale of salesWithoutBarcode) {
        // Générer un code-barres pour cette vente
        const saleDate = new Date(sale.created_at);
        const year = saleDate.getFullYear();
        const month = String(saleDate.getMonth() + 1).padStart(2, '0');
        const day = String(saleDate.getDate()).padStart(2, '0');
        const paddedId = String(sale.id).padStart(6, '0');
        const barcode = `${year}${month}${day}${paddedId}`;

        // Mettre à jour la vente avec le code-barres
        await connection.execute(`
          UPDATE sales 
          SET barcode = ? 
          WHERE id = ?
        `, [barcode, sale.id]);

        console.log(`✅ Code-barres ${barcode} ajouté à la vente #${sale.id}`);
      }
    } else {
      console.log('✅ Toutes les ventes ont déjà un code-barres');
    }

    // 6. Vérification finale
    console.log('\n🔍 6. Vérification finale...');
    const [finalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_sales,
        COUNT(barcode) as sales_with_barcode,
        COUNT(*) - COUNT(barcode) as sales_without_barcode
      FROM sales
    `);
    
    console.log('📊 Statistiques finales :');
    console.table(finalStats);

    // 7. Test de recherche par code-barres
    console.log('\n🔍 7. Test de recherche par code-barres...');
    const [testSearch] = await connection.execute(`
      SELECT id, barcode, total, created_at 
      FROM sales 
      WHERE barcode IS NOT NULL 
      LIMIT 3
    `);

    if (testSearch.length > 0) {
      console.log('📋 Exemples de codes-barres pour test :');
      testSearch.forEach(sale => {
        console.log(`  - Vente #${sale.id}: ${sale.barcode} (${sale.total}€)`);
      });
    }

    console.log('\n🎉 Diagnostic terminé avec succès !');
    console.log('📝 Prochaines étapes :');
    console.log('  1. Tester la recherche par code-barres dans l\'interface');
    console.log('  2. Créer une nouvelle vente à la caisse');
    console.log('  3. Vérifier que le code-barres apparaît dans Gestion des Ventes');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

// Exécuter le diagnostic
diagnoseBarcodeIssue();
