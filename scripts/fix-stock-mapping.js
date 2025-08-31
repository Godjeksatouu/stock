const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixStockMapping() {
  try {
    console.log('🔧 CORRECTION COMPLÈTE DU SYSTÈME DE STOCKS');
    console.log('=' .repeat(60));
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock'
    });
    
    console.log('✅ Connexion à la base de données réussie\n');
    
    // 1. Analyser les stocks existants
    console.log('📦 ANALYSE DES STOCKS EXISTANTS:');
    const [stocks] = await connection.execute('SELECT * FROM stocks ORDER BY id');
    stocks.forEach(stock => {
      console.log(`  ID: ${stock.id} | Nom: "${stock.name}"`);
    });
    console.log('');
    
    // 2. Analyser les utilisateurs par stock
    console.log('👥 UTILISATEURS PAR STOCK:');
    const [users] = await connection.execute(`
      SELECT u.*, s.name as stock_name 
      FROM users u 
      LEFT JOIN stocks s ON u.stock_id = s.id 
      WHERE u.role IN ('admin', 'caissier') 
      ORDER BY u.stock_id, u.role
    `);
    
    const usersByStock = {};
    users.forEach(user => {
      const stockId = user.stock_id;
      if (!usersByStock[stockId]) {
        usersByStock[stockId] = [];
      }
      usersByStock[stockId].push(user);
    });
    
    Object.keys(usersByStock).forEach(stockId => {
      const stockInfo = stocks.find(s => s.id == stockId);
      console.log(`  📍 Stock ID ${stockId} - "${stockInfo?.name || 'INCONNU'}"`);
      usersByStock[stockId].forEach(user => {
        console.log(`    ${user.role}: ${user.email}`);
      });
      console.log('');
    });
    
    // 3. Proposer les slugs corrects basés sur les noms
    console.log('🗺️ SLUGS PROPOSÉS BASÉS SUR LES NOMS:');
    const proposedMapping = {};
    const proposedNames = {};
    const proposedSlugs = {};
    
    stocks.forEach(stock => {
      let slug;
      const name = stock.name.toLowerCase();
      
      if (name.includes('al ouloum') || name.includes('alouloum')) {
        slug = 'al-ouloum';
      } else if (name.includes('renaissance')) {
        slug = 'renaissance';
      } else if (name.includes('gros') || name.includes('depot') || name.includes('dépôt')) {
        slug = 'gros';
      } else {
        // Générer un slug basé sur le nom
        slug = stock.name.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      proposedMapping[slug] = stock.id;
      proposedNames[stock.id] = stock.name;
      proposedSlugs[stock.id] = slug;
      
      console.log(`  "${stock.name}" → slug: "${slug}" (ID: ${stock.id})`);
    });
    console.log('');
    
    // 4. Générer le code TypeScript corrigé
    console.log('📝 CODE TYPESCRIPT À UTILISER:');
    console.log('```typescript');
    console.log('export const STOCK_MAPPING = {');
    Object.entries(proposedMapping).forEach(([slug, id]) => {
      console.log(`  '${slug}': ${id},`);
    });
    console.log('} as const;');
    console.log('');
    console.log('export const STOCK_NAMES = {');
    Object.entries(proposedNames).forEach(([id, name]) => {
      console.log(`  ${id}: '${name}',`);
    });
    console.log('} as const;');
    console.log('');
    console.log('export const STOCK_SLUGS = {');
    Object.entries(proposedSlugs).forEach(([id, slug]) => {
      console.log(`  ${id}: '${slug}',`);
    });
    console.log('} as const;');
    console.log('```');
    console.log('');
    
    // 5. Générer les URLs de test
    console.log('🔗 URLS DE CONNEXION À TESTER:');
    Object.entries(usersByStock).forEach(([stockId, stockUsers]) => {
      const stockInfo = stocks.find(s => s.id == stockId);
      const slug = proposedSlugs[stockId];
      
      console.log(`  📍 ${stockInfo?.name}:`);
      stockUsers.forEach(user => {
        const dashboardPath = user.role === 'caissier' ? `/dashboard/stock/${slug}/cashier` : `/dashboard/stock/${slug}`;
        console.log(`    ${user.role}: http://localhost:3000/login?stock=${slug}`);
        console.log(`      Email: ${user.email} | Password: ${user.role}123`);
        console.log(`      Dashboard: http://localhost:3000${dashboardPath}`);
      });
      console.log('');
    });
    
    // 6. Test de connexion simulé
    console.log('🧪 TEST DE CONNEXION SIMULÉ:');
    for (const [stockId, stockUsers] of Object.entries(usersByStock)) {
      const slug = proposedSlugs[stockId];
      const stockInfo = stocks.find(s => s.id == stockId);
      
      console.log(`  📍 Test pour "${stockInfo?.name}" (slug: ${slug})`);
      
      for (const user of stockUsers) {
        const requiredStockId = proposedMapping[slug];
        const hasAccess = user.stock_id === requiredStockId;
        const status = hasAccess ? '✅' : '❌';
        
        console.log(`    ${status} ${user.email}`);
        console.log(`        User stock_id: ${user.stock_id} | Required: ${requiredStockId} | Match: ${hasAccess}`);
      }
      console.log('');
    }
    
    await connection.end();
    
    console.log('🎯 PROCHAINES ÉTAPES:');
    console.log('1. Copier le code TypeScript ci-dessus dans lib/types.ts');
    console.log('2. Redémarrer le serveur de développement');
    console.log('3. Tester les URLs de connexion listées ci-dessus');
    console.log('4. Utiliser les emails et mots de passe indiqués');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixStockMapping();
