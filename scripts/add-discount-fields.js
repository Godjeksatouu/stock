const mysql = require('mysql2/promise');

async function addDiscountFields() {
  let connection;
  
  try {
    console.log('🔧 Adding discount fields to database...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Add discount fields to sales table
    console.log('\n📋 Adding discount fields to sales table...');
    
    const salesFields = [
      {
        name: 'global_discount_type',
        query: "ALTER TABLE sales ADD COLUMN global_discount_type ENUM('percentage', 'amount') DEFAULT 'percentage'"
      },
      {
        name: 'global_discount_value',
        query: "ALTER TABLE sales ADD COLUMN global_discount_value DECIMAL(10,2) DEFAULT 0.00"
      },
      {
        name: 'global_discount_amount',
        query: "ALTER TABLE sales ADD COLUMN global_discount_amount DECIMAL(10,2) DEFAULT 0.00"
      },
      {
        name: 'source',
        query: "ALTER TABLE sales ADD COLUMN source ENUM('pos', 'manual') DEFAULT 'manual'"
      }
    ];
    
    for (const field of salesFields) {
      try {
        await connection.execute(field.query);
        console.log(`   ✅ Added ${field.name} to sales table`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⚠️  Field ${field.name} already exists in sales table`);
        } else {
          console.log(`   ❌ Failed to add ${field.name}: ${error.message}`);
        }
      }
    }
    
    // Add discount fields to sale_items table
    console.log('\n📋 Adding discount fields to sale_items table...');
    
    const saleItemsFields = [
      {
        name: 'discount_type',
        query: "ALTER TABLE sale_items ADD COLUMN discount_type ENUM('percentage', 'amount') DEFAULT 'percentage'"
      },
      {
        name: 'discount_value',
        query: "ALTER TABLE sale_items ADD COLUMN discount_value DECIMAL(10,2) DEFAULT 0.00"
      },
      {
        name: 'discount_amount',
        query: "ALTER TABLE sale_items ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00"
      }
    ];
    
    for (const field of saleItemsFields) {
      try {
        await connection.execute(field.query);
        console.log(`   ✅ Added ${field.name} to sale_items table`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⚠️  Field ${field.name} already exists in sale_items table`);
        } else {
          console.log(`   ❌ Failed to add ${field.name}: ${error.message}`);
        }
      }
    }
    
    // Handle total_price column modification
    console.log('\n📋 Updating total_price column in sale_items table...');
    
    try {
      // Check if total_price is a generated column
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, EXTRA 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'stock' 
        AND TABLE_NAME = 'sale_items' 
        AND COLUMN_NAME = 'total_price'
      `);
      
      if (columns.length > 0 && columns[0].EXTRA.includes('GENERATED')) {
        console.log('   🔄 Dropping generated total_price column...');
        await connection.execute('ALTER TABLE sale_items DROP COLUMN total_price');
        console.log('   ✅ Dropped generated total_price column');
        
        console.log('   🔄 Adding new total_price column...');
        await connection.execute('ALTER TABLE sale_items ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00');
        console.log('   ✅ Added new total_price column');
      } else {
        console.log('   ⚠️  total_price column is not generated or does not exist');
      }
    } catch (error) {
      console.log(`   ❌ Failed to update total_price column: ${error.message}`);
    }
    
    // Add indexes
    console.log('\n📋 Adding indexes...');
    
    const indexes = [
      {
        name: 'idx_sales_source',
        query: 'ALTER TABLE sales ADD INDEX idx_sales_source (source)'
      },
      {
        name: 'idx_sales_global_discount',
        query: 'ALTER TABLE sales ADD INDEX idx_sales_global_discount (global_discount_value)'
      }
    ];
    
    for (const index of indexes) {
      try {
        await connection.execute(index.query);
        console.log(`   ✅ Added index ${index.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`   ⚠️  Index ${index.name} already exists`);
        } else {
          console.log(`   ❌ Failed to add index ${index.name}: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Discount fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

// Run the migration
addDiscountFields();
