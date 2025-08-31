const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function diagnoseAuth() {
  try {
    console.log('🔍 DIAGNOSTIC COMPLET DU SYSTÈME D\'AUTHENTIFICATION');
    console.log('=' .repeat(60));
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock'
    });
    
    console.log('✅ Connexion à la base de données réussie\n');
    
    // 1. Vérifier les stocks
    console.log('📦 STOCKS DANS LA BASE DE DONNÉES:');
    const [stocks] = await connection.execute('SELECT * FROM stocks ORDER BY id');
    stocks.forEach(stock => {
      console.log(`  ID: ${stock.id} | Nom: "${stock.name}" | Slug: "${stock.slug || 'N/A'}"`);
    });
    console.log('');
    
    // 2. Vérifier tous les utilisateurs
    console.log('👥 TOUS LES UTILISATEURS:');
    const [users] = await connection.execute('SELECT id, username, email, role, stock_id, is_active FROM users ORDER BY role, stock_id');
    users.forEach(user => {
      const status = user.is_active ? '✅' : '❌';
      console.log(`  ${status} ID: ${user.id} | Email: ${user.email} | Rôle: ${user.role} | Stock ID: ${user.stock_id}`);
    });
    console.log('');
    
    // 3. Tester les mots de passe
    console.log('🔑 TEST DES MOTS DE PASSE:');
    const bcrypt = require('bcryptjs');
    const testAccounts = [
      { email: 'caissier@renaissance.com', password: 'caissier123' },
      { email: 'caissier@alouloum.com', password: 'caissier123' },
      { email: 'admin@renaissance.com', password: 'admin123' },
      { email: 'admin@alouloum.com', password: 'admin123' },
      { email: 'admin@gros.com', password: 'admin123' }
    ];
    
    for (const account of testAccounts) {
      const [userRows] = await connection.execute('SELECT password FROM users WHERE email = ?', [account.email]);
      if (userRows.length > 0) {
        const isValid = await bcrypt.compare(account.password, userRows[0].password);
        const status = isValid ? '✅' : '❌';
        console.log(`  ${status} ${account.email} | Mot de passe: ${isValid ? 'VALIDE' : 'INVALIDE'}`);
      } else {
        console.log(`  ❌ ${account.email} | UTILISATEUR NON TROUVÉ`);
      }
    }
    console.log('');
    
    // 4. Analyser les correspondances stock
    console.log('🗺️ ANALYSE DES CORRESPONDANCES STOCK:');
    console.log('STOCK_MAPPING actuel dans le code:');
    console.log('  al-ouloum: 1');
    console.log('  renaissance: 2');
    console.log('  gros: 3');
    console.log('');
    
    console.log('Correspondances utilisateur → stock:');
    const caissiers = users.filter(u => u.role === 'caissier');
    caissiers.forEach(user => {
      const stockInfo = stocks.find(s => s.id === user.stock_id);
      console.log(`  ${user.email} (stock_id: ${user.stock_id}) → Stock: "${stockInfo?.name || 'INCONNU'}"`);
    });
    console.log('');
    
    // 5. Simuler les tentatives de connexion
    console.log('🔐 SIMULATION DES CONNEXIONS:');
    const STOCK_MAPPING = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };
    
    const testCases = [
      { email: 'caissier@renaissance.com', stockSlug: 'renaissance' },
      { email: 'caissier@alouloum.com', stockSlug: 'al-ouloum' },
      { email: 'admin@renaissance.com', stockSlug: 'renaissance' },
      { email: 'admin@gros.com', stockSlug: 'gros' }
    ];
    
    for (const testCase of testCases) {
      const [userRows] = await connection.execute('SELECT * FROM users WHERE email = ? AND is_active = true', [testCase.email]);
      
      if (userRows.length === 0) {
        console.log(`  ❌ ${testCase.email} → ${testCase.stockSlug} | UTILISATEUR NON TROUVÉ`);
        continue;
      }
      
      const user = userRows[0];
      const requiredStockId = STOCK_MAPPING[testCase.stockSlug];
      const hasAccess = user.stock_id === requiredStockId;
      const status = hasAccess ? '✅' : '❌';
      
      console.log(`  ${status} ${testCase.email} → ${testCase.stockSlug}`);
      console.log(`      User stock_id: ${user.stock_id} | Required: ${requiredStockId} | Match: ${hasAccess}`);
    }
    console.log('');
    
    // 6. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    
    // Vérifier les incohérences
    const inconsistencies = [];
    
    // Vérifier si caissier@renaissance.com a le bon stock_id
    const renaissanceUser = users.find(u => u.email === 'caissier@renaissance.com');
    if (renaissanceUser && renaissanceUser.stock_id !== STOCK_MAPPING.renaissance) {
      inconsistencies.push(`caissier@renaissance.com a stock_id ${renaissanceUser.stock_id} mais devrait avoir ${STOCK_MAPPING.renaissance}`);
    }

    // Vérifier si caissier@alouloum.com a le bon stock_id
    const alouloumUser = users.find(u => u.email === 'caissier@alouloum.com');
    if (alouloumUser && alouloumUser.stock_id !== STOCK_MAPPING['al-ouloum']) {
      inconsistencies.push(`caissier@alouloum.com a stock_id ${alouloumUser.stock_id} mais devrait avoir ${STOCK_MAPPING['al-ouloum']}`);
    }
    
    if (inconsistencies.length > 0) {
      console.log('  ⚠️ INCOHÉRENCES DÉTECTÉES:');
      inconsistencies.forEach(inc => console.log(`     - ${inc}`));
      console.log('');
      console.log('  🔧 SOLUTIONS POSSIBLES:');
      console.log('     1. Corriger les stock_id dans la base de données');
      console.log('     2. Ou corriger le STOCK_MAPPING dans le code');
      console.log('     3. Recréer les utilisateurs avec les bons stock_id');
    } else {
      console.log('  ✅ Aucune incohérence détectée dans les mappings');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  }
}

diagnoseAuth();
