const mysql = require('mysql2/promise');

async function deleteTestProducts() {
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

    console.log('🗑️  Deleting test products...\n');

    // Test products to delete
    const testReferences = ['LM001', 'CH200', 'SB001'];
    
    for (const reference of testReferences) {
      // First, check if the product exists
      const [products] = await connection.execute(
        'SELECT id, name, price FROM products WHERE reference = ?',
        [reference]
      );

      if (products.length > 0) {
        const product = products[0];
        console.log(`🔍 Found: ${reference} - ${product.name} (${product.price} DH)`);
        
        // Delete the product (this will cascade delete barcodes and sale_items)
        await connection.execute(
          'DELETE FROM products WHERE reference = ?',
          [reference]
        );
        
        console.log(`✅ Deleted: ${reference} - ${product.name}`);
      } else {
        console.log(`❌ Not found: ${reference}`);
      }
    }

    // Show remaining products
    console.log('\n📋 Remaining products:');
    const [remainingProducts] = await connection.execute(`
      SELECT p.reference, p.name, p.price, s.name as stock_name
      FROM products p
      INNER JOIN stocks s ON p.stock_id = s.id
      ORDER BY s.name, p.name
    `);

    if (remainingProducts.length === 0) {
      console.log('   No products remaining');
    } else {
      let currentStock = '';
      remainingProducts.forEach(product => {
        if (product.stock_name !== currentStock) {
          currentStock = product.stock_name;
          console.log(`\n🏪 ${currentStock}:`);
        }
        console.log(`   ${product.reference || 'N/A'} - ${product.name} (${product.price} DH)`);
      });
    }

    await connection.end();
    console.log('\n✅ Test products cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteTestProducts();
