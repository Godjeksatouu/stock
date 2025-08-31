const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function addAdminUsers() {
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

    console.log('👥 Testing password verification for existing users...\n');

    // Test password verification for Renaissance admin
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['admin@renaissance.com']
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      console.log('Found user:', user.email);
      console.log('Stored password hash:', user.password);

      // Test password verification
      const isValid = await bcrypt.compare('admin123', user.password);
      console.log('Password verification result:', isValid);

      if (!isValid) {
        console.log('❌ Password verification failed! Updating password...');

        // Generate new hash
        const saltRounds = 10;
        const newHash = await bcrypt.hash('admin123', saltRounds);
        console.log('New password hash:', newHash);

        // Update the password
        await connection.execute(
          'UPDATE users SET password = ? WHERE email = ?',
          [newHash, 'admin@renaissance.com']
        );

        console.log('✅ Password updated successfully!');

        // Test again
        const isValidNow = await bcrypt.compare('admin123', newHash);
        console.log('New password verification result:', isValidNow);
      } else {
        console.log('✅ Password verification successful!');
      }
    } else {
      console.log('❌ User not found!');
    }

    console.log('\n👥 Adding admin users to database...\n');

    // Define the users to add
    const users = [
      {
        username: 'admin_alouloum',
        email: 'admin@alouloum.com',
        password: 'admin123',
        role: 'admin',
        stock_id: 1, // Librairie Al Ouloum
        stock_name: 'Librairie Al Ouloum'
      },
      {
        username: 'admin_renaissance',
        email: 'admin@renaissance.com',
        password: 'admin123',
        role: 'admin',
        stock_id: 2, // Librairie La Renaissance
        stock_name: 'Librairie La Renaissance'
      },
      {
        username: 'admin_gros',
        email: 'admin@gros.com',
        password: 'admin123',
        role: 'admin',
        stock_id: 3, // Gros
        stock_name: 'Gros'
      },
      {
        username: 'superadmin',
        email: 'superadmin@system.com',
        password: 'admin123',
        role: 'super_admin',
        stock_id: null, // Super admin has access to all stocks
        stock_name: 'All Stocks'
      }
    ];

    for (const user of users) {
      try {
        // Check if user already exists
        const [existingUsers] = await connection.execute(
          'SELECT id, email FROM users WHERE email = ?',
          [user.email]
        );

        if (existingUsers.length > 0) {
          console.log(`⚠️  User already exists: ${user.email}`);
          continue;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);

        // Insert the user
        const [result] = await connection.execute(
          'INSERT INTO users (username, email, password, role, stock_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [user.username, user.email, hashedPassword, user.role, user.stock_id, true]
        );

        console.log(`✅ Added user: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Stock: ${user.stock_name}`);
        console.log(`   Password: ${user.password} (hashed in database)`);
        console.log('');

      } catch (userError) {
        console.error(`❌ Error adding user ${user.email}:`, userError.message);
      }
    }

    // Show all users in database
    console.log('📋 All users in database:');
    console.log('─'.repeat(80));
    
    const [allUsers] = await connection.execute(`
      SELECT u.id, u.username, u.email, u.role, u.is_active, s.name as stock_name
      FROM users u
      LEFT JOIN stocks s ON u.stock_id = s.id
      ORDER BY u.role, u.username
    `);

    allUsers.forEach(user => {
      const status = user.is_active ? '✅' : '❌';
      const stock = user.stock_name || 'All Stocks';
      console.log(`${status} ${user.email} | ${user.username} | ${user.role} | ${stock}`);
    });

    await connection.end();
    console.log('\n✅ Admin users setup completed!');
    console.log('\n🔑 Login credentials:');
    console.log('   Al Ouloum: admin@alouloum.com / admin123');
    console.log('   Renaissance: admin@renaissance.com / admin123');
    console.log('   Gros: admin@gros.com / admin123');
    console.log('   Super Admin: superadmin@system.com / admin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addAdminUsers();
