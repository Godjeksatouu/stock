const mysql = require('mysql2/promise');

async function verifyTestProduct() {
  try {
    require('dotenv').config({ path: '.env.local' });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'stock'
    });

    const [result] = await connection.execute(`
      SELECT p.name, GROUP_CONCAT(b.code) as barcodes 
      FROM products p 
      LEFT JOIN barcodes b ON p.id = b.product_id 
      WHERE p.name LIKE '%Test Product%' 
      GROUP BY p.id
    `);

    console.log('Test product with barcodes:', result);
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyTestProduct();
