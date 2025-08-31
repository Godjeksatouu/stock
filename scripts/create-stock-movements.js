const mysql = require('mysql2/promise');

async function createStockMovementsTables() {
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

    console.log('🔧 Creating stock movements tables...\n');

    // Check if stock_movements table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movements'
    `, [process.env.DB_NAME || 'stock']);

    if (tables.length > 0) {
      console.log('✅ stock_movements table already exists');
    } else {
      console.log('📋 Creating stock_movements table...');
      
      // Create stock_movements table
      await connection.execute(`
        CREATE TABLE stock_movements (
          id INT PRIMARY KEY AUTO_INCREMENT,
          from_stock_id INT NOT NULL,
          to_stock_id INT NOT NULL,
          user_id INT,
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
          FOREIGN KEY (from_stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
          FOREIGN KEY (to_stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_movement_from_stock (from_stock_id),
          INDEX idx_movement_to_stock (to_stock_id),
          INDEX idx_movement_status (status),
          INDEX idx_movement_date (created_at),
          INDEX idx_movement_number (movement_number)
        )
      `);
      
      console.log('✅ stock_movements table created successfully');
    }

    // Check if stock_movement_items table exists
    const [itemTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movement_items'
    `, [process.env.DB_NAME || 'stock']);

    if (itemTables.length > 0) {
      console.log('✅ stock_movement_items table already exists');
    } else {
      console.log('📋 Creating stock_movement_items table...');
      
      // Create stock_movement_items table
      await connection.execute(`
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
      
      console.log('✅ stock_movement_items table created successfully');
    }

    // Verify tables exist
    console.log('\n📋 Verifying stock movement tables...');
    const [allTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('stock_movements', 'stock_movement_items')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'stock']);

    console.log('✅ Stock movement tables verified:');
    allTables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    console.log('\n🎉 Stock movements module is ready!');
    console.log('\n📝 You can now:');
    console.log('   1. Create stock movements from depot to libraries');
    console.log('   2. Track movement status (pending, confirmed, claimed)');
    console.log('   3. Add products to movements');
    console.log('   4. Generate movement reports');

    await connection.end();
  } catch (error) {
    console.error('❌ Error creating stock movements tables:', error);
    process.exit(1);
  }
}

createStockMovementsTables();
