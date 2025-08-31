const mysql = require('mysql2/promise');

async function checkStockMovements() {
  let conn;
  try {
    console.log('🔍 Checking stock_movements schema...');
    
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Check if stock_movements table exists
    const [tables] = await conn.query(`SHOW TABLES LIKE 'stock_movements'`);
    if (tables.length === 0) {
      console.log('❌ stock_movements table does not exist');
      console.log('🔧 Creating stock_movements table...');
      
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
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ stock_movements table created');
    } else {
      console.log('✅ stock_movements table exists');
    }
    
    // Show current structure
    const [cols] = await conn.query('DESCRIBE stock_movements');
    console.log('📋 stock_movements columns:');
    console.table(cols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key,
      Default: c.Default
    })));
    
    // Check if stock_movement_items table exists
    const [itemTables] = await conn.query(`SHOW TABLES LIKE 'stock_movement_items'`);
    if (itemTables.length === 0) {
      console.log('❌ stock_movement_items table does not exist');
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
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ stock_movement_items table created');
    } else {
      console.log('✅ stock_movement_items table exists');
    }
    
    // Show items structure
    const [itemCols] = await conn.query('DESCRIBE stock_movement_items');
    console.log('📋 stock_movement_items columns:');
    console.table(itemCols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key,
      Default: c.Default
    })));
    
    console.log('🎉 Schema check complete!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔌 Connection closed');
    }
  }
}

checkStockMovements();
