const mysql = require('mysql2/promise');

async function testConnection() {
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

    console.log('✅ Database connection successful!');

    // Test basic queries
    const [stocks] = await connection.execute('SELECT * FROM stocks');
    console.log(`📦 Found ${stocks.length} stocks:`, stocks.map(s => s.name));

    const [users] = await connection.execute('SELECT username, email, role FROM users WHERE is_active = true');
    console.log(`👥 Found ${users.length} active users:`, users.map(u => `${u.username} (${u.role})`));

    const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
    console.log(`📋 Total products: ${products[0].count}`);

    await connection.end();
    console.log('✅ Database test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
