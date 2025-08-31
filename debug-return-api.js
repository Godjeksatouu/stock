const mysql = require('mysql2/promise');

async function debugReturnAPI() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('✅ Connected to database');

    // Test the exact logic from the API
    const original_sale_id = 2;
    const stock_id = 'renaissance';
    const return_type = 'refund';
    const return_items = [
      {
        product_id: 1,
        quantity: 1,
        unit_price: 10.50,
        reason: 'Test reason'
      }
    ];

    // Map stock_id to database ID
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };
    const dbStockId = stockMapping[stock_id];
    console.log('📍 Mapped stockId:', stock_id, '→', dbStockId);

    // Check if sale exists
    console.log('🔍 Checking if sale exists...');
    const [saleRows] = await connection.execute(
      'SELECT * FROM sales WHERE id = ? AND stock_id = ?',
      [original_sale_id, dbStockId]
    );

    if (saleRows.length === 0) {
      console.log('❌ Sale not found');
      return;
    }

    const sale = saleRows[0];
    console.log('✅ Sale found:', sale.id, 'Client ID:', sale.client_id);

    // Check database schema
    const [dbRows] = await connection.execute('SELECT DATABASE() AS db');
    const dbName = dbRows[0].db;
    console.log('📊 Database name:', dbName);

    // Check return_transactions table structure
    const [rtColumns] = await connection.execute(
      'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
      [dbName, 'return_transactions']
    );
    
    console.log('📋 return_transactions table columns:');
    rtColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check return_items table structure
    const [riColumns] = await connection.execute(
      'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
      [dbName, 'return_items']
    );
    
    console.log('📋 return_items table columns:');
    riColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Test the insert into return_transactions
    console.log('🔍 Testing return_transactions insert...');
    const finalClientId = sale.client_id || 1;
    const totalAmount = 10.50;

    try {
      const [result] = await connection.execute(
        'INSERT INTO return_transactions (client_id, total_amount) VALUES (?, ?)',
        [finalClientId, totalAmount]
      );
      
      const returnId = result.insertId;
      console.log('✅ Return transaction created successfully, ID:', returnId);

      // Test the insert into return_items
      console.log('🔍 Testing return_items insert...');
      try {
        await connection.execute(
          'INSERT INTO return_items (return_transaction_id, product_id, quantity, unit_price, action_type) VALUES (?, ?, ?, ?, ?)',
          [returnId, 1, 1, 10.50, 'return']
        );
        console.log('✅ Return item created successfully');

        // Test stock update
        console.log('🔍 Testing stock update...');
        await connection.execute(
          'UPDATE products SET quantity = quantity + ? WHERE id = ? AND stock_id = ?',
          [1, 1, dbStockId]
        );
        console.log('✅ Stock updated successfully');

        // Clean up test data
        await connection.execute('DELETE FROM return_items WHERE return_transaction_id = ?', [returnId]);
        await connection.execute('DELETE FROM return_transactions WHERE id = ?', [returnId]);
        console.log('🧹 Test data cleaned up');

      } catch (itemError) {
        console.log('❌ Return item insert failed:', itemError.message);
        // Clean up transaction
        await connection.execute('DELETE FROM return_transactions WHERE id = ?', [returnId]);
      }

    } catch (transactionError) {
      console.log('❌ Return transaction insert failed:', transactionError.message);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

debugReturnAPI();
