const mysql = require('mysql2/promise');

async function checkSalesTable() {
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

    console.log('🔍 Checking sales table structure...\n');

    // Check table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'stock']);

    console.log('📊 Current sales table structure:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    });

    // Check if enhanced columns exist
    const requiredColumns = ['client_id', 'payment_method', 'payment_status', 'notes'];
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    console.log('\n🔍 Enhanced columns check:');
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`   ✅ ${col} - EXISTS`);
      } else {
        console.log(`   ❌ ${col} - MISSING`);
      }
    });

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing columns detected. Adding them now...');
      
      for (const column of missingColumns) {
        try {
          let alterQuery = '';
          switch (column) {
            case 'client_id':
              alterQuery = 'ALTER TABLE sales ADD COLUMN client_id INT NULL AFTER stock_id';
              break;
            case 'payment_method':
              alterQuery = "ALTER TABLE sales ADD COLUMN payment_method ENUM('cash', 'card', 'check', 'credit') DEFAULT 'cash'";
              break;
            case 'payment_status':
              alterQuery = "ALTER TABLE sales ADD COLUMN payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'paid'";
              break;
            case 'notes':
              alterQuery = 'ALTER TABLE sales ADD COLUMN notes TEXT';
              break;
          }
          
          if (alterQuery) {
            await connection.execute(alterQuery);
            console.log(`   ✅ Added column: ${column}`);
          }
        } catch (error) {
          console.log(`   ❌ Failed to add column ${column}: ${error.message}`);
        }
      }

      // Add foreign key and indexes if client_id was added
      if (missingColumns.includes('client_id')) {
        try {
          await connection.execute('ALTER TABLE sales ADD FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL');
          console.log('   ✅ Added foreign key for client_id');
        } catch (error) {
          console.log(`   ⚠️  Foreign key might already exist: ${error.message}`);
        }

        try {
          await connection.execute('ALTER TABLE sales ADD INDEX idx_sales_client (client_id)');
          console.log('   ✅ Added index for client_id');
        } catch (error) {
          console.log(`   ⚠️  Index might already exist: ${error.message}`);
        }
      }

      if (missingColumns.includes('payment_status')) {
        try {
          await connection.execute('ALTER TABLE sales ADD INDEX idx_sales_payment_status (payment_status)');
          console.log('   ✅ Added index for payment_status');
        } catch (error) {
          console.log(`   ⚠️  Index might already exist: ${error.message}`);
        }
      }
    } else {
      console.log('\n✅ All enhanced columns are present!');
    }

    console.log('\n🎉 Sales table check completed!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error checking sales table:', error);
    process.exit(1);
  }
}

checkSalesTable();
