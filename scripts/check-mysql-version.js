const mysql = require('mysql2/promise');

async function checkMySQLVersion() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock'
    });

    console.log('✅ Connected to database');

    // Get MySQL version
    const [versionResult] = await connection.execute('SELECT VERSION() as version');
    console.log(`🗄️  MySQL Version: ${versionResult[0].version}`);

    // Get additional server info
    const [variables] = await connection.execute(`
      SHOW VARIABLES WHERE Variable_name IN (
        'version', 
        'version_comment', 
        'version_compile_machine', 
        'version_compile_os'
      )
    `);

    console.log('\n📊 Server Information:');
    variables.forEach(variable => {
      console.log(`   ${variable.Variable_name}: ${variable.Value}`);
    });

    // Check if it's MariaDB
    const [mariadbCheck] = await connection.execute(`
      SHOW VARIABLES LIKE 'version_comment'
    `);
    
    if (mariadbCheck.length > 0 && mariadbCheck[0].Value.toLowerCase().includes('mariadb')) {
      console.log('\n🐬 Database Type: MariaDB');
    } else {
      console.log('\n🐬 Database Type: MySQL');
    }

    // Check storage engines
    const [engines] = await connection.execute('SHOW ENGINES');
    console.log('\n🔧 Available Storage Engines:');
    engines.forEach(engine => {
      if (engine.Support === 'YES' || engine.Support === 'DEFAULT') {
        console.log(`   ✅ ${engine.Engine} - ${engine.Comment}`);
      }
    });

    // Check current database info
    const [dbInfo] = await connection.execute(`
      SELECT 
        SCHEMA_NAME as database_name,
        DEFAULT_CHARACTER_SET_NAME as charset,
        DEFAULT_COLLATION_NAME as collation
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = ?
    `, [process.env.DB_NAME || 'stock']);

    if (dbInfo.length > 0) {
      console.log('\n📋 Current Database Info:');
      console.log(`   Database: ${dbInfo[0].database_name}`);
      console.log(`   Charset: ${dbInfo[0].charset}`);
      console.log(`   Collation: ${dbInfo[0].collation}`);
    }

    await connection.end();
    console.log('\n✅ Version check completed!');

  } catch (error) {
    console.error('❌ Error checking MySQL version:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure MySQL/MariaDB server is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Check your database credentials in .env.local');
    }
    
    process.exit(1);
  }
}

checkMySQLVersion();
