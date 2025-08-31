const mysql = require('mysql2/promise');

async function addTestBarcode() {
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

    console.log('Connected to database');

    // Check if barcode already exists
    const [existing] = await connection.execute(
      'SELECT * FROM barcodes WHERE code = ?',
      ['6932391924068']
    );

    if (existing.length > 0) {
      console.log('✅ Barcode 6932391924068 already exists in database');
    } else {
      // Add the barcode to the first product (Livre de mathématiques)
      await connection.execute(
        'INSERT INTO barcodes (product_id, code) VALUES (?, ?)',
        [1, '6932391924068']
      );
      console.log('✅ Added barcode 6932391924068 to product ID 1 (Livre de mathématiques)');
    }

    // Show the product details
    const [product] = await connection.execute(
      `SELECT p.*, GROUP_CONCAT(b.code) as barcodes
       FROM products p
       LEFT JOIN barcodes b ON p.id = b.product_id
       WHERE p.id = 1
       GROUP BY p.id`
    );

    console.log('📋 Product details:', {
      name: product[0].name,
      reference: product[0].reference,
      price: product[0].price,
      barcodes: product[0].barcodes
    });

    await connection.end();
    console.log('✅ Test barcode setup completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestBarcode();
