const mysql = require('mysql2/promise');

async function testPasswords() {
  const passwords = [
    '5E$)r}$5ptL)-!n}',
    '"5E$)r}$5ptL)-!n}"',
    'password123',
    ''
  ];

  for (const password of passwords) {
    try {
      console.log(`\n🔍 Testing password: "${password}"`);
      
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: password,
        database: 'stock'
      });

      console.log(`✅ SUCCESS with password: "${password}"`);
      await connection.end();
      break;
    } catch (error) {
      console.log(`❌ FAILED with password: "${password}" - ${error.message}`);
    }
  }
}

testPasswords();
