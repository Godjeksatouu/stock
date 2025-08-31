const mysql = require('mysql2/promise');

async function checkProducts() {
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

    console.log('📋 Checking existing products...\n');

    // Get all products with their references
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.reference, p.price, p.quantity, s.name as stock_name
      FROM products p
      INNER JOIN stocks s ON p.stock_id = s.id
      ORDER BY p.stock_id, p.id
    `);

    console.log(`Found ${products.length} products:\n`);

    let currentStock = '';
    products.forEach(product => {
      if (product.stock_name !== currentStock) {
        currentStock = product.stock_name;
        console.log(`\n🏪 ${currentStock}:`);
        console.log('─'.repeat(50));
      }
      
      console.log(`  ID: ${product.id} | Ref: ${product.reference || 'N/A'} | ${product.name} | ${product.price} DH | Qty: ${product.quantity}`);
    });

    // Check for duplicate references
    const [duplicates] = await connection.execute(`
      SELECT reference, COUNT(*) as count
      FROM products 
      WHERE reference IS NOT NULL AND reference != ''
      GROUP BY reference 
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      console.log('\n⚠️  Duplicate references found:');
      duplicates.forEach(dup => {
        console.log(`  Reference "${dup.reference}" appears ${dup.count} times`);
      });
    } else {
      console.log('\n✅ No duplicate references found');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProducts();
