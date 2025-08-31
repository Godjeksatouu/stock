const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stock',
  multipleStatements: true
};

async function createReturnTables() {
  let connection;
  
  try {
    console.log('🔄 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie');

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, 'create-return-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Exécution du script SQL...');
    
    // Exécuter le script SQL
    const [results] = await connection.execute(sql);
    
    console.log('✅ Tables de retours créées avec succès !');
    
    // Vérifier que les tables existent
    console.log('\n🔍 Vérification des tables créées...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME IN ('return_transactions', 'return_items')
      ORDER BY TABLE_NAME
    `);
    
    console.log('📋 Tables trouvées :');
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}`);
    });
    
    // Afficher la structure des tables
    console.log('\n📊 Structure de return_transactions :');
    const [rtStructure] = await connection.execute('DESCRIBE return_transactions');
    console.table(rtStructure);
    
    console.log('\n📊 Structure de return_items :');
    const [riStructure] = await connection.execute('DESCRIBE return_items');
    console.table(riStructure);
    
    console.log('\n🎉 Configuration terminée ! Le système de retours est prêt.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des tables :', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Suggestion : Vérifiez que les tables référencées existent :');
      console.log('  - stocks');
      console.log('  - sales');
      console.log('  - users');
      console.log('  - clients');
      console.log('  - products');
      console.log('  - sale_items');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Fonction pour vérifier les tables existantes
async function checkExistingTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔍 Vérification des tables existantes...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'stock'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📋 Tables existantes dans la base de données :');
    tables.forEach(table => {
      console.log(`  📄 ${table.TABLE_NAME}`);
    });
    
    // Vérifier les tables requises
    const requiredTables = ['stocks', 'sales', 'users', 'clients', 'products', 'sale_items'];
    const existingTableNames = tables.map(t => t.TABLE_NAME);
    
    console.log('\n✅ Vérification des dépendances :');
    requiredTables.forEach(tableName => {
      const exists = existingTableNames.includes(tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    });
    
    const missingTables = requiredTables.filter(t => !existingTableNames.includes(t));
    if (missingTables.length > 0) {
      console.log('\n⚠️  Tables manquantes détectées :');
      missingTables.forEach(table => {
        console.log(`  ❌ ${table}`);
      });
      console.log('\n💡 Vous devez d\'abord créer ces tables avant les tables de retours.');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification :', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Script principal
async function main() {
  console.log('🚀 Création des tables de retours\n');
  
  // Vérifier les tables existantes
  const canProceed = await checkExistingTables();
  
  if (!canProceed) {
    console.log('\n❌ Impossible de continuer. Créez d\'abord les tables manquantes.');
    process.exit(1);
  }
  
  console.log('\n✅ Toutes les dépendances sont satisfaites. Création des tables de retours...\n');
  
  // Créer les tables de retours
  await createReturnTables();
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createReturnTables, checkExistingTables };
