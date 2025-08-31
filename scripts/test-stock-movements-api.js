const mysql = require('mysql2/promise');

async function testStockMovementsAPI() {
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

    console.log('🧪 Testing Stock Movements API functionality...\n');

    // Test 1: Verify table exists and is accessible
    console.log('📋 Test 1: Verify table accessibility...');
    try {
      const [result] = await connection.execute(`
        SELECT sm.*, 
               fs.name as from_stock_name,
               ts.name as to_stock_name,
               u.username as user_name
        FROM stock_movements sm
        LEFT JOIN stocks fs ON sm.from_stock_id = fs.id
        LEFT JOIN stocks ts ON sm.to_stock_id = ts.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE sm.from_stock_id = ? 
        ORDER BY sm.created_at DESC 
        LIMIT ? OFFSET ?
      `, [3, 10, 0]); // Test with stock ID 3 (Gros)
      
      console.log('✅ Query executed successfully');
      console.log(`   Found ${result.length} stock movements`);
    } catch (error) {
      console.error('❌ Query failed:', error.message);
      return;
    }

    // Test 2: Insert a test stock movement
    console.log('\n📋 Test 2: Insert test stock movement...');
    try {
      const movementNumber = `TEST-${Date.now()}`;
      const [insertResult] = await connection.execute(`
        INSERT INTO stock_movements 
        (from_stock_id, to_stock_id, user_id, movement_number, recipient_name, 
         total_amount, notes, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [3, 1, 1, movementNumber, 'Test Recipient', 100.50, 'Test movement']);
      
      console.log('✅ Insert successful');
      console.log(`   Movement ID: ${insertResult.insertId}`);
      console.log(`   Movement Number: ${movementNumber}`);

      // Test 3: Query the inserted movement
      console.log('\n📋 Test 3: Query inserted movement...');
      const [queryResult] = await connection.execute(`
        SELECT sm.*, 
               fs.name as from_stock_name,
               ts.name as to_stock_name,
               u.username as user_name
        FROM stock_movements sm
        LEFT JOIN stocks fs ON sm.from_stock_id = fs.id
        LEFT JOIN stocks ts ON sm.to_stock_id = ts.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE sm.id = ?
      `, [insertResult.insertId]);

      if (queryResult.length > 0) {
        console.log('✅ Query successful');
        console.log(`   Movement: ${queryResult[0].movement_number}`);
        console.log(`   From: ${queryResult[0].from_stock_name}`);
        console.log(`   To: ${queryResult[0].to_stock_name}`);
        console.log(`   User: ${queryResult[0].user_name}`);
        console.log(`   Status: ${queryResult[0].status}`);
      }

      // Test 4: Clean up - delete test movement
      console.log('\n📋 Test 4: Clean up test data...');
      await connection.execute('DELETE FROM stock_movements WHERE id = ?', [insertResult.insertId]);
      console.log('✅ Test data cleaned up');

    } catch (error) {
      console.error('❌ Insert/Query failed:', error.message);
      return;
    }

    console.log('\n🎉 All tests passed! Stock movements API should work correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Navigate to http://localhost:3001');
    console.log('   2. Login with admin credentials');
    console.log('   3. Go to Stock Movements section');
    console.log('   4. Try creating a new stock movement');

    await connection.end();
  } catch (error) {
    console.error('❌ Error testing stock movements API:', error);
    process.exit(1);
  }
}

testStockMovementsAPI();
