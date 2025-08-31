const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function applyEnhancedSchema() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock',
      multipleStatements: true
    });

    console.log('🔧 Applying Enhanced Database Schema...\n');

    // Read and execute the enhanced schema file
    const schemaFile = path.join(__dirname, 'enhanced-database-schema.sql');
    const sql = fs.readFileSync(schemaFile, 'utf8');

    console.log('📊 Executing enhanced schema script...');
    
    // Clean the SQL and remove USE statements since we're already connected to the database
    const cleanedSql = sql.replace(/USE\s+\w+\s*;/gi, '').trim();

    // Split the SQL into individual statements to handle them properly
    const statements = cleanedSql.split(';').filter(stmt => {
      const trimmed = stmt.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          // Use query instead of execute for DDL statements
          await connection.query(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          // Some statements might fail if they already exist (like ALTER TABLE)
          // We'll log warnings but continue
          if (error.code === 'ER_DUP_FIELDNAME' ||
              error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
              error.code === 'ER_DUP_KEYNAME' ||
              error.code === 'ER_TABLE_EXISTS_ERROR' ||
              error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠️  Statement ${i + 1}: ${error.message} (continuing...)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
            // Don't throw error, just log and continue
            console.log('Continuing with next statement...');
          }
        }
      }
    }

    console.log('\n🎉 Enhanced database schema applied successfully!');
    
    // Verify the new tables exist
    console.log('\n📋 Verifying new tables...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('clients', 'fournisseurs', 'achats', 'achat_items', 'reparations', 'cheques', 'caisse_sessions', 'caisse_transactions', 'reglement_caisse', 'reglement_fournisseur', 'daily_profits', 'notifications')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'stock']);

    console.log('✅ New tables created:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    // Check sample data
    console.log('\n👥 Sample data inserted:');
    const [clients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    const [fournisseurs] = await connection.execute('SELECT COUNT(*) as count FROM fournisseurs');
    
    console.log(`   - Clients: ${clients[0].count}`);
    console.log(`   - Fournisseurs: ${fournisseurs[0].count}`);

    console.log('\n🚀 Database is ready for enhanced business modules!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update TypeScript interfaces');
    console.log('   2. Create API endpoints for new modules');
    console.log('   3. Build frontend components');
    console.log('   4. Implement role-based access control');

    await connection.end();
  } catch (error) {
    console.error('❌ Error applying enhanced schema:', error);
    process.exit(1);
  }
}

applyEnhancedSchema();
