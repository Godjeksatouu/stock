const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fullDiagnosis() {
  try {
    console.log('🔍 DIAGNOSTIC COMPLET DU SYSTÈME');
    console.log('=' .repeat(80));
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock'
    });
    
    console.log('✅ Connexion à la base de données réussie\n');
    
    // 1. VÉRIFICATION DE LA STRUCTURE DE LA BASE
    console.log('📋 1. STRUCTURE DE LA BASE DE DONNÉES:');
    console.log('-'.repeat(50));
    
    // Vérifier les tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables existantes:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    console.log('');
    
    // Structure de la table users
    console.log('Structure de la table users:');
    const [userColumns] = await connection.execute('DESCRIBE users');
    userColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key} ${col.Default || ''}`);
    });
    console.log('');
    
    // Structure de la table stocks
    console.log('Structure de la table stocks:');
    const [stockColumns] = await connection.execute('DESCRIBE stocks');
    stockColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key} ${col.Default || ''}`);
    });
    console.log('');
    
    // 2. VÉRIFICATION DES DONNÉES
    console.log('📊 2. DONNÉES DANS LA BASE:');
    console.log('-'.repeat(50));
    
    // Stocks
    const [stocks] = await connection.execute('SELECT * FROM stocks ORDER BY id');
    console.log('Stocks:');
    stocks.forEach(stock => {
      console.log(`  ID: ${stock.id} | Nom: "${stock.name}" | Actif: ${stock.is_active ? 'Oui' : 'Non'}`);
    });
    console.log('');
    
    // Utilisateurs avec détails complets
    const [users] = await connection.execute(`
      SELECT u.*, s.name as stock_name 
      FROM users u 
      LEFT JOIN stocks s ON u.stock_id = s.id 
      ORDER BY u.stock_id, u.role
    `);
    console.log('Utilisateurs:');
    users.forEach(user => {
      const status = user.is_active ? '✅' : '❌';
      console.log(`  ${status} ID: ${user.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Username: ${user.username}`);
      console.log(`      Rôle: ${user.role}`);
      console.log(`      Stock ID: ${user.stock_id} (${user.stock_name || 'AUCUN'})`);
      console.log(`      Actif: ${user.is_active ? 'Oui' : 'Non'}`);
      console.log(`      Créé: ${user.created_at}`);
      console.log(`      Modifié: ${user.updated_at}`);
      console.log('');
    });
    
    // 3. VÉRIFICATION DES MOTS DE PASSE
    console.log('🔑 3. VÉRIFICATION DES MOTS DE PASSE:');
    console.log('-'.repeat(50));
    
    const bcrypt = require('bcryptjs');
    const testPasswords = {
      'admin@alouloum.com': 'admin123',
      'admin@renaissance.com': 'admin123',
      'admin@gros.com': 'admin123',
      'caissier@alouloum.com': 'caissier123',
      'caissier@renaissance.com': 'caissier123',
      'superadmin@system.com': 'superadmin123'
    };
    
    for (const [email, expectedPassword] of Object.entries(testPasswords)) {
      const [userRows] = await connection.execute('SELECT password FROM users WHERE email = ?', [email]);
      if (userRows.length > 0) {
        const isValid = await bcrypt.compare(expectedPassword, userRows[0].password);
        const status = isValid ? '✅' : '❌';
        console.log(`  ${status} ${email}: ${isValid ? 'VALIDE' : 'INVALIDE'}`);
      } else {
        console.log(`  ❌ ${email}: UTILISATEUR NON TROUVÉ`);
      }
    }
    console.log('');
    
    // 4. VÉRIFICATION DU MAPPING
    console.log('🗺️ 4. VÉRIFICATION DU STOCK MAPPING:');
    console.log('-'.repeat(50));
    
    const STOCK_MAPPING = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };
    
    console.log('STOCK_MAPPING dans le code:');
    Object.entries(STOCK_MAPPING).forEach(([slug, id]) => {
      const stock = stocks.find(s => s.id === id);
      console.log(`  "${slug}" → ID ${id} (${stock ? stock.name : 'STOCK NON TROUVÉ'})`);
    });
    console.log('');
    
    // 5. SIMULATION DE CONNEXIONS
    console.log('🧪 5. SIMULATION DE CONNEXIONS:');
    console.log('-'.repeat(50));
    
    const testCases = [
      { email: 'caissier@alouloum.com', stockSlug: 'al-ouloum' },
      { email: 'caissier@renaissance.com', stockSlug: 'renaissance' },
      { email: 'admin@alouloum.com', stockSlug: 'al-ouloum' },
      { email: 'admin@renaissance.com', stockSlug: 'renaissance' },
      { email: 'admin@gros.com', stockSlug: 'gros' }
    ];
    
    for (const testCase of testCases) {
      console.log(`Test: ${testCase.email} → ${testCase.stockSlug}`);
      
      const [userRows] = await connection.execute('SELECT * FROM users WHERE email = ? AND is_active = true', [testCase.email]);
      
      if (userRows.length === 0) {
        console.log(`  ❌ Utilisateur non trouvé ou inactif`);
        continue;
      }
      
      const user = userRows[0];
      const requiredStockId = STOCK_MAPPING[testCase.stockSlug];
      const hasAccess = user.stock_id === requiredStockId;
      
      console.log(`  👤 User: ID ${user.id}, Role: ${user.role}, Stock ID: ${user.stock_id}`);
      console.log(`  🏪 Required Stock ID: ${requiredStockId}`);
      console.log(`  ${hasAccess ? '✅' : '❌'} Accès: ${hasAccess ? 'AUTORISÉ' : 'REFUSÉ'}`);
      
      if (!hasAccess) {
        console.log(`  ⚠️  PROBLÈME: User stock_id (${user.stock_id}) ≠ Required (${requiredStockId})`);
      }
      console.log('');
    }
    
    // 6. VÉRIFICATION DES SESSIONS/TOKENS
    console.log('🎫 6. VÉRIFICATION DES SESSIONS/TOKENS:');
    console.log('-'.repeat(50));
    
    // Vérifier s'il y a une table sessions
    const [sessionTables] = await connection.execute("SHOW TABLES LIKE 'sessions'");
    if (sessionTables.length > 0) {
      const [sessions] = await connection.execute('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10');
      console.log(`Sessions actives: ${sessions.length}`);
      sessions.forEach(session => {
        console.log(`  Session ID: ${session.id}, User ID: ${session.user_id}, Créée: ${session.created_at}`);
      });
    } else {
      console.log('❌ Aucune table sessions trouvée');
      console.log('ℹ️  Le système utilise localStorage côté client');
    }
    console.log('');
    
    // 7. RECOMMANDATIONS
    console.log('💡 7. RECOMMANDATIONS:');
    console.log('-'.repeat(50));
    
    const issues = [];
    
    // Vérifier les utilisateurs inactifs
    const inactiveUsers = users.filter(u => !u.is_active);
    if (inactiveUsers.length > 0) {
      issues.push(`${inactiveUsers.length} utilisateur(s) inactif(s) détecté(s)`);
    }
    
    // Vérifier les utilisateurs sans stock
    const usersWithoutStock = users.filter(u => u.role !== 'super_admin' && !u.stock_id);
    if (usersWithoutStock.length > 0) {
      issues.push(`${usersWithoutStock.length} utilisateur(s) sans stock assigné`);
    }
    
    // Vérifier les incohérences de mapping
    let mappingIssues = 0;
    for (const testCase of testCases) {
      const user = users.find(u => u.email === testCase.email);
      if (user) {
        const requiredStockId = STOCK_MAPPING[testCase.stockSlug];
        if (user.stock_id !== requiredStockId) {
          mappingIssues++;
        }
      }
    }
    
    if (issues.length === 0 && mappingIssues === 0) {
      console.log('✅ Aucun problème détecté dans la base de données');
      console.log('✅ Tous les mappings sont corrects');
      console.log('');
      console.log('🔍 Le problème est probablement dans:');
      console.log('  1. La logique de redirection côté client');
      console.log('  2. Les problèmes d\'hydratation React');
      console.log('  3. Les composants de sécurité ajoutés');
    } else {
      console.log('⚠️ Problèmes détectés:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      if (mappingIssues > 0) {
        console.log(`  - ${mappingIssues} incohérence(s) de mapping détectée(s)`);
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  }
}

fullDiagnosis();
