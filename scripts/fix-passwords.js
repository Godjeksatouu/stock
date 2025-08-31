const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupRoleBasedAccess() {
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

    console.log('🔧 Setting up role-based access control...\n');

    // Step 1: Update users table to support caissier role
    console.log('📝 Updating users table schema...');
    await connection.execute(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('admin', 'caissier', 'super_admin') DEFAULT 'admin'
    `);
    console.log('✅ Users table updated with caissier role');

    // Step 2: Create caissier users for each library
    console.log('\n👥 Creating caissier users...');

    const caissierUsers = [
      {
        username: 'caissier_alouloum',
        email: 'caissier@alouloum.com',
        password: 'caissier123',
        role: 'caissier',
        stock_id: 1,
        library: 'Librairie Al Ouloum'
      },
      {
        username: 'caissier_renaissance',
        email: 'caissier@renaissance.com',
        password: 'caissier123',
        role: 'caissier',
        stock_id: 2,
        library: 'Librairie La Renaissance'
      }
    ];

    for (const user of caissierUsers) {
      // Check if user already exists
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (existing.length === 0) {
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);

        // Insert new caissier user
        await connection.execute(`
          INSERT INTO users (username, email, password, role, stock_id, is_active)
          VALUES (?, ?, ?, ?, ?, true)
        `, [user.username, user.email, hashedPassword, user.role, user.stock_id]);

        console.log(`✅ Created caissier for ${user.library}: ${user.email}`);
      } else {
        console.log(`ℹ️  Caissier already exists for ${user.library}: ${user.email}`);
      }
    }

    // Step 3: Fix existing admin passwords
    console.log('\n🔧 Fixing existing admin passwords...');
    const [adminUsers] = await connection.execute(
      'SELECT * FROM users WHERE role IN ("admin", "super_admin") AND is_active = true'
    );

    for (const user of adminUsers) {
      const isValid = await bcrypt.compare('admin123', user.password);
      if (!isValid) {
        const saltRounds = 10;
        const newHash = await bcrypt.hash('admin123', saltRounds);
        await connection.execute(
          'UPDATE users SET password = ? WHERE id = ?',
          [newHash, user.id]
        );
        console.log(`✅ Password updated for ${user.email}`);
      } else {
        console.log(`✅ Password already correct for ${user.email}`);
      }
    }

    console.log('\n🎉 Role-based access control setup complete!');
    console.log('\n🔑 Login credentials:');
    console.log('\n📚 LIBRAIRIE AL OULOUM:');
    console.log('   👑 Admin: admin@alouloum.com / admin123');
    console.log('   💰 Caissier: caissier@alouloum.com / caissier123');
    console.log('\n📚 LIBRAIRIE LA RENAISSANCE:');
    console.log('   👑 Admin: admin@renaissance.com / admin123');
    console.log('   💰 Caissier: caissier@renaissance.com / caissier123');
    console.log('\n🏢 GROS (Dépôt général):');
    console.log('   👑 Admin: admin@gros.com / admin123');
    console.log('\n🌟 SUPER ADMIN:');
    console.log('   🔧 Super Admin: superadmin@system.com / admin123');

    await connection.end();
  } catch (error) {
    console.error('❌ Error setting up role-based access:', error);
    process.exit(1);
  }
}

setupRoleBasedAccess();
