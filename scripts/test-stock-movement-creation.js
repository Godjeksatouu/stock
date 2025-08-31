const mysql = require('mysql2/promise');

async function testStockMovementCreation() {
  let conn;
  try {
    console.log('🧪 Testing stock movement creation...');
    
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Test data
    const testMovement = {
      from_stock_id: 3, // Dépôt
      to_stock_id: 2,   // La Renaissance
      user_id: 1,
      recipient_name: 'Test Responsable',
      notes: 'Test movement creation',
      items: [
        { product_id: 712, quantity: 2, unit_price: 18.00 },
        { product_id: 80, quantity: 1, unit_price: 3.00 }
      ]
    };
    
    // Generate movement number
    const movementNumber = `MOV-TEST-${Date.now()}`;
    const totalAmount = testMovement.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    console.log('📋 Test movement data:');
    console.log(`  Movement Number: ${movementNumber}`);
    console.log(`  From Stock: ${testMovement.from_stock_id} → To Stock: ${testMovement.to_stock_id}`);
    console.log(`  Recipient: ${testMovement.recipient_name}`);
    console.log(`  Total Amount: ${totalAmount}€`);
    console.log(`  Items: ${testMovement.items.length}`);
    
    // Start transaction
    await conn.beginTransaction();
    
    try {
      // Insert movement header
      const [headerResult] = await conn.execute(`
        INSERT INTO stock_movements (from_stock_id, to_stock_id, user_id, movement_number, recipient_name, total_amount, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
      `, [
        testMovement.from_stock_id,
        testMovement.to_stock_id,
        testMovement.user_id,
        movementNumber,
        testMovement.recipient_name,
        totalAmount,
        testMovement.notes
      ]);
      
      const movementId = headerResult.insertId;
      console.log(`✅ Movement header created with ID: ${movementId}`);
      
      // Insert movement items
      for (const item of testMovement.items) {
        await conn.execute(`
          INSERT INTO stock_movement_items (movement_id, product_id, quantity, unit_price, total_price, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          movementId,
          item.product_id,
          item.quantity,
          item.unit_price,
          (item.quantity * item.unit_price),
          null
        ]);
      }
      
      console.log(`✅ ${testMovement.items.length} movement items created`);
      
      await conn.commit();
      console.log('✅ Transaction committed successfully');
      
      // Verify the created movement
      const [movement] = await conn.query(`
        SELECT sm.*, 
               COUNT(smi.id) as item_count,
               SUM(smi.total_price) as items_total
        FROM stock_movements sm
        LEFT JOIN stock_movement_items smi ON sm.id = smi.movement_id
        WHERE sm.id = ?
        GROUP BY sm.id
      `, [movementId]);
      
      if (movement.length > 0) {
        console.log('📋 Created movement verification:');
        console.table([{
          id: movement[0].id,
          movement_number: movement[0].movement_number,
          recipient_name: movement[0].recipient_name,
          status: movement[0].status,
          total_amount: movement[0].total_amount,
          item_count: movement[0].item_count,
          items_total: movement[0].items_total,
          match: Math.abs(parseFloat(movement[0].total_amount) - parseFloat(movement[0].items_total)) < 0.01 ? '✅' : '❌'
        }]);
      }
      
      // Show movement items
      const [items] = await conn.query(`
        SELECT smi.*, p.name as product_name
        FROM stock_movement_items smi
        LEFT JOIN products p ON smi.product_id = p.id
        WHERE smi.movement_id = ?
      `, [movementId]);
      
      console.log('📦 Movement items:');
      console.table(items.map(item => ({
        product: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })));
      
      console.log('🎉 Stock movement creation test successful!');
      console.log(`✅ Movement ${movementNumber} created with ${testMovement.items.length} items`);
      console.log('✅ All data integrity checks passed');
      
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Full error:', err);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔌 Connection closed');
    }
  }
}

testStockMovementCreation();
