const mysql = require('mysql2/promise');

async function createReturnTables() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });
    
    console.log('Connected successfully');
    
    // Create return_transactions table
    console.log('Creating return_transactions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS return_transactions (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_return_stock (stock_id),
        INDEX idx_return_sale (original_sale_id),
        INDEX idx_return_date (created_at),
        INDEX idx_return_status (status)
      )
    `);
    
    console.log('return_transactions table created');
    
    // Create return_items table
    console.log('Creating return_items table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS return_items (
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
        FOREIGN KEY (return_transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE,
        INDEX idx_return_item_transaction (return_transaction_id),
        INDEX idx_return_item_product (product_id),
        INDEX idx_return_item_action (action_type)
      )
    `);
    
    console.log('return_items table created');
    
    // Verify tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME IN ('return_transactions', 'return_items')
    `);
    
    console.log('Tables created:', tables.map(t => t.TABLE_NAME));
    console.log('SUCCESS: Return tables created successfully!');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createReturnTables();
