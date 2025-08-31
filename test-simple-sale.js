const mysql = require('mysql2/promise');

async function testSimpleSale() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🧪 Testing simple sale creation directly in database...');

    // First, check if we have products
    const [products] = await connection.execute(`
      SELECT id, name, price FROM products 
      WHERE stock_id = 2 AND is_active = 1 
      LIMIT 3
    `);

    console.log(`📦 Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`  - ${product.name}: ${product.price} DH (ID: ${product.id})`);
    });

    if (products.length === 0) {
      console.log('❌ No products found. Cannot create sale.');
      await connection.end();
      return;
    }

    // Create a simple sale
    const saleData = {
      user_id: 1,
      stock_id: 2,
      client_id: null,
      total: 25.50,
      amount_paid: 25.50,
      change_amount: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      notes: 'Test sale from script'
    };

    console.log('\n💰 Creating sale...');
    const [saleResult] = await connection.execute(`
      INSERT INTO sales (user_id, stock_id, client_id, total, amount_paid, change_amount, payment_method, payment_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      saleData.user_id,
      saleData.stock_id,
      saleData.client_id,
      saleData.total,
      saleData.amount_paid,
      saleData.change_amount,
      saleData.payment_method,
      saleData.payment_status,
      saleData.notes
    ]);

    const saleId = saleResult.insertId;
    console.log(`✅ Sale created with ID: ${saleId}`);

    // Add sale item
    console.log('\n📦 Adding sale item...');
    const [itemResult] = await connection.execute(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?)
    `, [
      saleId,
      products[0].id,
      1,
      25.50,
      25.50
    ]);

    console.log(`✅ Sale item added with ID: ${itemResult.insertId}`);

    // Generate barcode
    const saleDate = new Date();
    const year = saleDate.getFullYear();
    const month = String(saleDate.getMonth() + 1).padStart(2, '0');
    const day = String(saleDate.getDate()).padStart(2, '0');
    const paddedId = String(saleId).padStart(6, '0');
    const saleBarcode = `${year}${month}${day}${paddedId}`;

    await connection.execute(`
      UPDATE sales SET barcode = ? WHERE id = ?
    `, [saleBarcode, saleId]);

    console.log(`🔍 Sale barcode generated: ${saleBarcode}`);

    // Verify the sale
    const [saleCheck] = await connection.execute(`
      SELECT s.*, COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.id = ?
      GROUP BY s.id
    `, [saleId]);

    if (saleCheck.length > 0) {
      const sale = saleCheck[0];
      console.log('\n✅ Sale verification:');
      console.log(`   ID: ${sale.id}`);
      console.log(`   Total: ${sale.total} DH`);
      console.log(`   Paid: ${sale.amount_paid} DH`);
      console.log(`   Status: ${sale.payment_status}`);
      console.log(`   Items: ${sale.item_count}`);
      console.log(`   Barcode: ${sale.barcode}`);
    }

    await connection.end();
    console.log('\n🎉 Simple sale test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing simple sale:', error.message);
  }
}

testSimpleSale();
