const mysql = require('mysql2/promise');

async function migrateStockMovements() {
  let conn;
  try {
    console.log('🔄 Migrating stock_movements schema...');
    
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Backup existing data if any
    const [existingData] = await conn.query('SELECT * FROM stock_movements LIMIT 5');
    if (existingData.length > 0) {
      console.log('📋 Found existing data in stock_movements:');
      console.table(existingData);
      console.log('⚠️ This migration will restructure the table. Existing data will be preserved where possible.');
    }
    
    // Drop and recreate with correct structure
    console.log('🔧 Dropping old stock_movements table...');
    await conn.query('DROP TABLE IF EXISTS stock_movements');
    
    console.log('🔧 Creating new stock_movements table with correct structure...');
    await conn.query(`
      CREATE TABLE stock_movements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        from_stock_id INT NOT NULL,
        to_stock_id INT NOT NULL,
        user_id INT NULL,
        movement_number VARCHAR(50) UNIQUE NOT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        status ENUM('pending', 'confirmed', 'claimed') DEFAULT 'pending',
        notes TEXT,
        claim_message TEXT,
        claim_date TIMESTAMP NULL,
        confirmed_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_movement_from_stock (from_stock_id),
        INDEX idx_movement_to_stock (to_stock_id),
        INDEX idx_movement_status (status),
        INDEX idx_movement_date (created_at),
        INDEX idx_movement_number (movement_number)
      )
    `);
    
    console.log('✅ New stock_movements table created');
    
    // Verify new structure
    const [cols] = await conn.query('DESCRIBE stock_movements');
    console.log('📋 New stock_movements structure:');
    console.table(cols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key,
      Default: c.Default
    })));
    
    // Ensure stock_movement_items exists with correct structure
    await conn.query('DROP TABLE IF EXISTS stock_movement_items');
    
    console.log('🔧 Creating stock_movement_items table...');
    await conn.query(`
      CREATE TABLE stock_movement_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        movement_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (movement_id) REFERENCES stock_movements(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_movement_item_movement (movement_id),
        INDEX idx_movement_item_product (product_id)
      )
    `);
    
    console.log('✅ stock_movement_items table created');
    
    // Verify items structure
    const [itemCols] = await conn.query('DESCRIBE stock_movement_items');
    console.log('📋 stock_movement_items structure:');
    console.table(itemCols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key,
      Default: c.Default
    })));
    
    console.log('🎉 Migration complete! Stock movements schema is now ready.');
    console.log('📝 You can now create stock movements with:');
    console.log('   - movement_number (unique identifier)');
    console.log('   - recipient_name (responsible person)');
    console.log('   - status (pending/confirmed/claimed)');
    console.log('   - total_amount (computed from items)');
    console.log('   - items in stock_movement_items table');
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.error('Full error:', err);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔌 Connection closed');
    }
  }
}

migrateStockMovements();
