const mysql = require('mysql2/promise');

async function testBarcodeAPI() {
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

    console.log('✅ Connected to database');

    // Test the new products query with barcodes
    const [products] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.reference,
        p.price,
        p.quantity,
        p.stock_id,
        GROUP_CONCAT(b.code) as barcodes
      FROM products p
      LEFT JOIN barcodes b ON p.id = b.product_id
      WHERE p.stock_id = 1
      GROUP BY p.id
      ORDER BY p.name ASC
      LIMIT 5
    `);

    console.log('\n📦 Products with barcodes (Librairie Al Ouloum):');
    console.log('─'.repeat(80));
    
    products.forEach(product => {
      const barcodes = product.barcodes ? product.barcodes.split(',') : [];
      const primaryBarcode = barcodes.length > 0 ? barcodes[0] : 'Aucun';
      
      console.log(`ID: ${product.id}`);
      console.log(`Nom: ${product.name}`);
      console.log(`Référence: ${product.reference || 'N/A'}`);
      console.log(`Code Barres Principal: ${primaryBarcode}`);
      console.log(`Tous les codes-barres: ${barcodes.join(', ') || 'Aucun'}`);
      console.log(`Prix: ${product.price} DH`);
      console.log(`Quantité: ${product.quantity}`);
      console.log('─'.repeat(40));
    });

    await connection.end();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBarcodeAPI();
