const mysql = require('mysql2');

// Configuration de la base de données
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stock'
});

console.log('🔍 Recherche des produits en double dans la base de données...\n');

// Connexion à la base de données
connection.connect((err) => {
  if (err) {
    console.error('❌ Erreur de connexion:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connecté à la base de données MySQL');
  
  // Requête pour identifier les doublons basés sur le nom
  const findDuplicatesQuery = `
    SELECT 
      name,
      COUNT(*) as duplicate_count,
      GROUP_CONCAT(id ORDER BY id) as product_ids,
      GROUP_CONCAT(reference ORDER BY id) as references,
      GROUP_CONCAT(price ORDER BY id) as prices,
      GROUP_CONCAT(created_at ORDER BY id) as created_dates
    FROM products 
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, name
  `;
  
  console.log('📋 Recherche des doublons par nom de produit...\n');
  
  connection.query(findDuplicatesQuery, (err, duplicates) => {
    if (err) {
      console.error('❌ Erreur lors de la recherche des doublons:', err.message);
      connection.end();
      process.exit(1);
    }
    
    if (duplicates.length === 0) {
      console.log('✅ Aucun doublon trouvé dans la base de données !');
      connection.end();
      return;
    }
    
    console.log(`⚠️  ${duplicates.length} groupe(s) de doublons trouvé(s) :\n`);
    
    let totalDuplicates = 0;
    
    duplicates.forEach((group, index) => {
      const ids = group.product_ids.split(',');
      const references = group.references.split(',');
      const prices = group.prices.split(',');
      const dates = group.created_dates.split(',');
      
      totalDuplicates += group.duplicate_count - 1; // -1 car on garde un exemplaire
      
      console.log(`📦 Groupe ${index + 1}: "${group.name}"`);
      console.log(`   Nombre de doublons: ${group.duplicate_count}`);
      console.log('   Détails:');
      
      ids.forEach((id, i) => {
        console.log(`   - ID: ${id} | Ref: ${references[i] || 'N/A'} | Prix: ${prices[i]}€ | Créé: ${new Date(dates[i]).toLocaleDateString('fr-FR')}`);
      });
      console.log('');
    });
    
    console.log(`📊 Résumé:`);
    console.log(`   - ${duplicates.length} groupes de doublons`);
    console.log(`   - ${totalDuplicates} produits à supprimer`);
    console.log(`   - ${duplicates.reduce((sum, g) => sum + g.duplicate_count, 0)} produits concernés au total\n`);
    
    // Vérifier les relations avec les ventes
    console.log('🔗 Vérification des relations avec les ventes...\n');
    
    const checkSalesQuery = `
      SELECT 
        p.name,
        p.id as product_id,
        COUNT(si.id) as sales_count,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        COALESCE(SUM(si.quantity * si.unit_price), 0) as total_revenue
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      WHERE p.name IN (${duplicates.map(() => '?').join(',')})
      GROUP BY p.id, p.name
      ORDER BY p.name, sales_count DESC
    `;
    
    const productNames = duplicates.map(d => d.name);
    
    connection.query(checkSalesQuery, productNames, (err, salesData) => {
      if (err) {
        console.error('❌ Erreur lors de la vérification des ventes:', err.message);
        connection.end();
        process.exit(1);
      }
      
      // Grouper les données de vente par nom de produit
      const salesByProduct = {};
      salesData.forEach(sale => {
        if (!salesByProduct[sale.name]) {
          salesByProduct[sale.name] = [];
        }
        salesByProduct[sale.name].push(sale);
      });
      
      console.log('📈 Impact sur les ventes:');
      
      duplicates.forEach(group => {
        const sales = salesByProduct[group.name] || [];
        const totalSales = sales.reduce((sum, s) => sum + s.sales_count, 0);
        const totalRevenue = sales.reduce((sum, s) => sum + s.total_revenue, 0);
        
        console.log(`\n   "${group.name}":`);
        console.log(`   - ${totalSales} ventes au total`);
        console.log(`   - ${totalRevenue.toFixed(2)}€ de chiffre d'affaires`);
        
        if (sales.length > 0) {
          console.log('   - Répartition par ID:');
          sales.forEach(sale => {
            console.log(`     * ID ${sale.product_id}: ${sale.sales_count} ventes, ${sale.total_revenue.toFixed(2)}€`);
          });
        }
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('📋 PLAN DE NETTOYAGE RECOMMANDÉ:');
      console.log('='.repeat(60));
      
      duplicates.forEach((group, index) => {
        const ids = group.product_ids.split(',').map(id => parseInt(id));
        const sales = salesByProduct[group.name] || [];
        
        // Trouver le produit à conserver (celui avec le plus de ventes, ou le plus ancien)
        let keepId = ids[0]; // Par défaut, garder le premier (plus ancien)
        
        if (sales.length > 0) {
          // Garder celui avec le plus de ventes
          const bestSale = sales.reduce((best, current) => 
            current.sales_count > best.sales_count ? current : best
          );
          keepId = bestSale.product_id;
        }
        
        const toDelete = ids.filter(id => id !== keepId);
        
        console.log(`\n${index + 1}. "${group.name}":`);
        console.log(`   ✅ GARDER: ID ${keepId} (${sales.find(s => s.product_id === keepId)?.sales_count || 0} ventes)`);
        console.log(`   ❌ SUPPRIMER: ID(s) ${toDelete.join(', ')}`);
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('⚠️  ATTENTION: Avant de supprimer, nous devons:');
      console.log('1. Transférer toutes les ventes vers les produits à conserver');
      console.log('2. Mettre à jour les références dans sale_items');
      console.log('3. Supprimer les doublons');
      console.log('4. Vérifier l\'intégrité des données');
      console.log('\n💡 Exécutez le script de nettoyage pour procéder automatiquement.');
      
      // Fermer la connexion
      connection.end();
      console.log('\n🔌 Analyse terminée');
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
