const mysql = require('mysql2/promise');

async function checkReturnTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Check if return tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME IN ('return_transactions', 'return_items')
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n📋 Return tables status:');
    const tableNames = tables.map(t => t.TABLE_NAME);
    
    if (tableNames.includes('return_transactions')) {
      console.log('✅ return_transactions - EXISTS');
    } else {
      console.log('❌ return_transactions - MISSING');
    }
    
    if (tableNames.includes('return_items')) {
      console.log('✅ return_items - EXISTS');
    } else {
      console.log('❌ return_items - MISSING');
    }
    
    // If tables don't exist, create them
    if (tableNames.length === 0) {
      console.log('\n🔧 Creating return tables...');
      
      // Create return_transactions
      await connection.execute(`
        CREATE TABLE return_transactions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          stock_id INT NOT NULL,
          original_sale_id INT NOT NULL,
          user_id INT,
          client_id INT,
          return_type ENUM('refund', 'exchange') NOT NULL,
          total_refund_amount DECIMAL(10,2) DEFAULT 0.00,
          total_exchange_amount DECIMAL(10,2) DEFAULT 0.00,
          balance_adjustment DECIMAL(10,2) DEFAULT 0.00,
          payment_method ENUM('cash', 'card', 'check', 'credit') DEFAULT 'cash',
          notes TEXT,
          status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
          processed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ return_transactions created');
      
      // Create return_items
      await connection.execute(`
        CREATE TABLE return_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          return_transaction_id INT NOT NULL,
          original_sale_item_id INT,
          product_id INT NOT NULL,
          action_type ENUM('return', 'exchange_out', 'exchange_in') NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          reason VARCHAR(255),
          condition_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (return_transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ return_items created');
      
      console.log('\n🎉 Return tables created successfully!');
    } else {
      console.log('\n✅ Return tables already exist');
    }
    
    // Show table structures
    if (tableNames.includes('return_transactions')) {
      console.log('\n📊 return_transactions structure:');
      const [rtStructure] = await connection.execute('DESCRIBE return_transactions');
      console.table(rtStructure);
    }
    
    if (tableNames.includes('return_items')) {
      console.log('\n📊 return_items structure:');
      const [riStructure] = await connection.execute('DESCRIBE return_items');
      console.table(riStructure);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

checkReturnTables();
