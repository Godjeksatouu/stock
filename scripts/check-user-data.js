const mysql = require('mysql2/promise');

async function checkUserData() {
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

    console.log('🔍 Checking user data and stock mappings...\n');

    // Check all users
    const [users] = await connection.execute(`
      SELECT u.id, u.username, u.email, u.role, u.stock_id, s.name as stock_name
      FROM users u
      LEFT JOIN stocks s ON u.stock_id = s.id
      WHERE u.is_active = true
      ORDER BY u.id
    `);

    console.log('👥 Active users:');
    users.forEach(user => {
      console.log(`   ID: ${user.id} | Username: ${user.username} | Role: ${user.role} | Stock: ${user.stock_name || 'None'} (ID: ${user.stock_id || 'None'})`);
    });

    // Check stocks
    const [stocks] = await connection.execute('SELECT * FROM stocks ORDER BY id');
    
    console.log('\n🏪 Available stocks:');
    stocks.forEach(stock => {
      console.log(`   ID: ${stock.id} | Name: ${stock.name}`);
    });

    // Check STOCK_MAPPING consistency
    console.log('\n🗺️  Stock mapping verification:');
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3,
    };

    for (const [slug, expectedId] of Object.entries(stockMapping)) {
      const stock = stocks.find(s => s.id === expectedId);
      if (stock) {
        console.log(`   ✅ ${slug} -> ${expectedId} (${stock.name})`);
      } else {
        console.log(`   ❌ ${slug} -> ${expectedId} (NOT FOUND)`);
      }
    }

    // Check for caissier users specifically
    console.log('\n👨‍💼 Caissier users:');
    const caissiers = users.filter(u => u.role === 'caissier');
    if (caissiers.length > 0) {
      caissiers.forEach(caissier => {
        console.log(`   ${caissier.username} -> Stock: ${caissier.stock_name} (ID: ${caissier.stock_id})`);
      });
    } else {
      console.log('   No caissier users found');
    }

    // Sample user data structure for localStorage
    console.log('\n📝 Sample user data structure for localStorage:');
    if (users.length > 0) {
      const sampleUser = users[0];
      const userDataStructure = {
        id: sampleUser.id,
        username: sampleUser.username,
        email: sampleUser.email,
        role: sampleUser.role,
        stockId: sampleUser.stock_id,
        stockName: sampleUser.stock_name
      };
      console.log('   ', JSON.stringify(userDataStructure, null, 2));
    }

    console.log('\n🎉 User data check completed!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error checking user data:', error);
    process.exit(1);
  }
}

checkUserData();
