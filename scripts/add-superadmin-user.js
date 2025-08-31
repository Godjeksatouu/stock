const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addSuperAdminUser() {
  let connection;
  
  try {
    console.log('🔧 Adding superadmin@admin.com user...\n');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Connected to database');

    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, is_active FROM users WHERE email = ?',
      ['superadmin@admin.com']
    );

    if (existingUsers.length > 0) {
      console.log('⚠️  User superadmin@admin.com already exists');
      
      // Update to make sure it's active
      await connection.execute(
        'UPDATE users SET is_active = 1, password = ? WHERE email = ?',
        ['admin123', 'superadmin@admin.com']
      );
      
      console.log('✅ Updated existing user to be active');
    } else {
      // Insert new superadmin user
      await connection.execute(`
        INSERT INTO users (username, email, password, role, stock_id, is_active) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'superadmin_alt',
        'superadmin@admin.com', 
        'admin123',
        'super_admin',
        null,
        1
      ]);
      
      console.log('✅ Created new superadmin@admin.com user');
    }

    // Verify all super admin users
    console.log('\n📋 All Super Admin users:');
    const [superAdmins] = await connection.execute(
      'SELECT id, email, username, role, is_active FROM users WHERE role = "super_admin"'
    );

    superAdmins.forEach(user => {
      const status = user.is_active ? '✅' : '❌';
      console.log(`${status} ${user.email} | ${user.username} | ${user.role}`);
    });

    console.log('\n🔑 Super Admin Login credentials:');
    console.log('   superadmin@system.com / admin123');
    console.log('   superadmin@admin.com / admin123');
    console.log('\n✅ Setup completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addSuperAdminUser();
