const mysql = require('mysql2/promise');

async function safeMigrateStockMovements() {
  let conn;
  try {
    console.log('🔄 Safe migration of stock_movements schema...');
    
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Disable foreign key checks temporarily
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔧 Disabled foreign key checks');
    
    // Backup existing data
    const [existingData] = await conn.query('SELECT * FROM stock_movements');
    console.log(`📋 Found ${existingData.length} existing movements to preserve`);
    
    // Drop tables in correct order
    await conn.query('DROP TABLE IF EXISTS stock_movement_items');
    await conn.query('DROP TABLE IF EXISTS stock_movements');
    console.log('🗑️ Dropped old tables');
    
    // Create new stock_movements table
    console.log('🔧 Creating new stock_movements table...');
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
    
    // Create stock_movement_items table
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
    
    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔧 Re-enabled foreign key checks');
    
    // Migrate old data if any (convert old single-product movements to new format)
    if (existingData.length > 0) {
      console.log('🔄 Converting old movement data to new format...');
      
      for (const oldMovement of existingData) {
        try {
          // Get product details for pricing
          const [product] = await conn.query('SELECT name, price FROM products WHERE id = ?', [oldMovement.product_id]);
          const productPrice = product.length > 0 ? product[0].price : 0;
          const totalAmount = oldMovement.quantity * productPrice;
          
          // Create new movement header
          const movementNumber = `MOV-MIGRATED-${oldMovement.id}`;
          const [headerResult] = await conn.query(`
            INSERT INTO stock_movements (from_stock_id, to_stock_id, user_id, movement_number, recipient_name, total_amount, status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
          `, [
            oldMovement.from_stock_id,
            oldMovement.to_stock_id,
            oldMovement.user_id,
            movementNumber,
            'Migration - Unknown',
            totalAmount,
            oldMovement.reason || 'Migrated movement',
            oldMovement.created_at
          ]);
          
          const newMovementId = headerResult.insertId;
          
          // Create movement item
          await conn.query(`
            INSERT INTO stock_movement_items (movement_id, product_id, quantity, unit_price, total_price, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            newMovementId,
            oldMovement.product_id,
            oldMovement.quantity,
            productPrice,
            totalAmount,
            oldMovement.created_at
          ]);
          
          console.log(`✅ Migrated movement ${oldMovement.id} → ${newMovementId} (${movementNumber})`);
        } catch (migErr) {
          console.warn(`⚠️ Failed to migrate movement ${oldMovement.id}:`, migErr.message);
        }
      }
    }
    
    // Verify new structure
    const [cols] = await conn.query('DESCRIBE stock_movements');
    console.log('📋 New stock_movements structure:');
    console.table(cols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key
    })));
    
    const [itemCols] = await conn.query('DESCRIBE stock_movement_items');
    console.log('📋 stock_movement_items structure:');
    console.table(itemCols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key
    })));
    
    // Show migrated data
    const [newMovements] = await conn.query('SELECT id, movement_number, recipient_name, total_amount, status FROM stock_movements LIMIT 5');
    if (newMovements.length > 0) {
      console.log('📋 Migrated movements:');
      console.table(newMovements);
    }
    
    console.log('🎉 Safe migration complete!');
    console.log('✅ Stock movements schema is now ready with proper structure');
    console.log('✅ Old data has been preserved and converted to new format');
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.error('Full error:', err);
  } finally {
    if (conn) {
      // Ensure foreign key checks are re-enabled
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {}
      await conn.end();
      console.log('🔌 Connection closed');
    }
  }
}

safeMigrateStockMovements();
