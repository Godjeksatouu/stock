const mysql = require('mysql2/promise');

async function fixSaleItemsTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔧 Fixing sale_items table structure...');
    
    // Check if total_price column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sale_items' 
      AND COLUMN_NAME = 'total_price'
    `);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE sale_items 
        ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER unit_price
      `);
      console.log('✅ total_price column added successfully');
      
      // Update existing records to calculate total_price
      await connection.execute(`
        UPDATE sale_items 
        SET total_price = quantity * unit_price 
        WHERE total_price = 0
      `);
      console.log('✅ Existing records updated with calculated total_price');
    } else {
      console.log('✅ total_price column already exists');
    }

    // Check if created_at column exists
    const [createdAtColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sale_items' 
      AND COLUMN_NAME = 'created_at'
    `);

    if (createdAtColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE sale_items 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ created_at column added successfully');
    } else {
      console.log('✅ created_at column already exists');
    }

    // Show final table structure
    const [finalStructure] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sale_items'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 Final sale_items table structure:');
    finalStructure.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT || 'NULL'})`);
    });

    await connection.end();
    console.log('\n✅ sale_items table structure fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sale_items table:', error.message);
  }
}

fixSaleItemsTable();
