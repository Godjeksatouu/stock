const mysql = require('mysql2/promise');

async function verifyTables() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });

    console.log('🔍 Verifying database connection and tables...\n');
    console.log('Database config:');
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Port: ${process.env.DB_PORT || '3306'}`);
    console.log(`  User: ${process.env.DB_USER || 'root'}`);
    console.log(`  Database: ${process.env.DB_NAME || 'stock'}\n`);

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock'
    });

    console.log('✅ Database connection successful!\n');

    // List all tables in the database
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'stock']);

    console.log('📋 All tables in database:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    // Check specifically for stock_movements table
    const [stockMovementTables] = await connection.execute(`
      SELECT TABLE_NAME, CREATE_TIME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movements'
    `, [process.env.DB_NAME || 'stock']);

    console.log('\n🔍 Stock movements table check:');
    if (stockMovementTables.length > 0) {
      console.log('✅ stock_movements table exists');
      console.log(`   Created: ${stockMovementTables[0].CREATE_TIME}`);
      
      // Check table structure
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movements'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'stock']);

      console.log('\n📊 Table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });

      // Test a simple query
      console.log('\n🧪 Testing query...');
      const [testResult] = await connection.execute('SELECT COUNT(*) as count FROM stock_movements');
      console.log(`✅ Query successful! Found ${testResult[0].count} records`);
      
    } else {
      console.log('❌ stock_movements table does NOT exist');
    }

    // Check stock_movement_items table
    const [stockMovementItemTables] = await connection.execute(`
      SELECT TABLE_NAME, CREATE_TIME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movement_items'
    `, [process.env.DB_NAME || 'stock']);

    console.log('\n🔍 Stock movement items table check:');
    if (stockMovementItemTables.length > 0) {
      console.log('✅ stock_movement_items table exists');
      console.log(`   Created: ${stockMovementItemTables[0].CREATE_TIME}`);
    } else {
      console.log('❌ stock_movement_items table does NOT exist');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error verifying tables:', error);
    process.exit(1);
  }
}

verifyTables();
