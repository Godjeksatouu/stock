const mysql = require('mysql2/promise');

async function applySchemaStepByStep() {
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

    console.log('🔧 Applying Enhanced Database Schema Step by Step...\n');

    // Step 1: Create clients table
    console.log('📋 Step 1: Creating clients table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(150),
          phone VARCHAR(20),
          address TEXT,
          stock_id INT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
          INDEX idx_clients_stock (stock_id),
          INDEX idx_clients_active (is_active)
        )
      `);
      console.log('✅ Clients table created successfully');
    } catch (error) {
      console.log('⚠️  Clients table already exists or error:', error.message);
    }

    // Step 2: Create fournisseurs table
    console.log('\n📋 Step 2: Creating fournisseurs table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS fournisseurs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(150),
          phone VARCHAR(20),
          address TEXT,
          contact_person VARCHAR(100),
          payment_terms VARCHAR(50) DEFAULT '30 jours',
          stock_id INT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
          INDEX idx_fournisseurs_stock (stock_id),
          INDEX idx_fournisseurs_active (is_active)
        )
      `);
      console.log('✅ Fournisseurs table created successfully');
    } catch (error) {
      console.log('⚠️  Fournisseurs table already exists or error:', error.message);
    }

    // Step 3: Modify sales table
    console.log('\n📋 Step 3: Modifying sales table...');
    const salesModifications = [
      'ALTER TABLE sales ADD COLUMN client_id INT NULL AFTER stock_id',
      'ALTER TABLE sales ADD COLUMN payment_method ENUM("cash", "card", "check", "credit") DEFAULT "cash"',
      'ALTER TABLE sales ADD COLUMN payment_status ENUM("pending", "partial", "paid") DEFAULT "paid"',
      'ALTER TABLE sales ADD COLUMN notes TEXT'
    ];

    for (const modification of salesModifications) {
      try {
        await connection.query(modification);
        console.log(`✅ Sales modification applied: ${modification.substring(0, 50)}...`);
      } catch (error) {
        console.log(`⚠️  Sales modification skipped: ${error.message}`);
      }
    }

    // Add foreign key for client_id after the column exists
    try {
      await connection.query('ALTER TABLE sales ADD FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL');
      console.log('✅ Sales client foreign key added');
    } catch (error) {
      console.log('⚠️  Sales client foreign key skipped:', error.message);
    }

    // Step 4: Create achats table
    console.log('\n📋 Step 4: Creating achats table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS achats (
          id INT PRIMARY KEY AUTO_INCREMENT,
          fournisseur_id INT NOT NULL,
          stock_id INT NOT NULL,
          reference VARCHAR(50),
          total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          payment_method ENUM('cash', 'card', 'check', 'credit') DEFAULT 'cash',
          payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
          delivery_date DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE CASCADE,
          FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
          INDEX idx_achats_fournisseur (fournisseur_id),
          INDEX idx_achats_stock (stock_id),
          INDEX idx_achats_payment_status (payment_status),
          INDEX idx_achats_date (created_at)
        )
      `);
      console.log('✅ Achats table created successfully');
    } catch (error) {
      console.log('⚠️  Achats table already exists or error:', error.message);
    }

    // Step 5: Create achat_items table
    console.log('\n📋 Step 5: Creating achat_items table...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS achat_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          achat_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) AS (quantity * unit_price) STORED,
          FOREIGN KEY (achat_id) REFERENCES achats(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          INDEX idx_achat_items_achat (achat_id),
          INDEX idx_achat_items_product (product_id)
        )
      `);
      console.log('✅ Achat_items table created successfully');
    } catch (error) {
      console.log('⚠️  Achat_items table already exists or error:', error.message);
    }

    // Step 6: Insert sample data
    console.log('\n📋 Step 6: Inserting sample data...');
    try {
      await connection.query(`
        INSERT IGNORE INTO clients (name, email, phone, address, stock_id) VALUES
        ('Ahmed Benali', 'ahmed.benali@email.com', '0612345678', '123 Rue Mohammed V, Casablanca', 1),
        ('Fatima Zahra', 'fatima.zahra@email.com', '0623456789', '456 Avenue Hassan II, Rabat', 1),
        ('Omar Alami', 'omar.alami@email.com', '0634567890', '789 Boulevard Zerktouni, Casablanca', 2),
        ('Aicha Bennani', 'aicha.bennani@email.com', '0645678901', '321 Rue Allal Ben Abdellah, Rabat', 2),
        ('Youssef Tazi', 'youssef.tazi@email.com', '0656789012', '654 Avenue Mohammed VI, Casablanca', 3)
      `);
      console.log('✅ Sample clients inserted');
    } catch (error) {
      console.log('⚠️  Sample clients insertion error:', error.message);
    }

    try {
      await connection.query(`
        INSERT IGNORE INTO fournisseurs (name, email, phone, address, contact_person, stock_id) VALUES
        ('Librairie Centrale', 'contact@librairie-centrale.ma', '0522123456', 'Zone Industrielle Ain Sebaa, Casablanca', 'Hassan Alaoui', 1),
        ('Papeterie du Maroc', 'info@papeterie-maroc.ma', '0537234567', 'Quartier Industriel, Salé', 'Nadia Benkirane', 2),
        ('Fournitures Scolaires SA', 'ventes@fournitures-sa.ma', '0523345678', 'Route de Rabat, Casablanca', 'Karim Fassi', 3),
        ('Distribution Atlas', 'commercial@atlas-dist.ma', '0524456789', 'Zone Franche, Tanger', 'Laila Chraibi', 1)
      `);
      console.log('✅ Sample fournisseurs inserted');
    } catch (error) {
      console.log('⚠️  Sample fournisseurs insertion error:', error.message);
    }

    // Verify the new tables exist
    console.log('\n📋 Verifying new tables...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('clients', 'fournisseurs', 'achats', 'achat_items')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'stock']);

    console.log('✅ Tables verified:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    // Check sample data
    console.log('\n👥 Sample data verification:');
    try {
      const [clients] = await connection.query('SELECT COUNT(*) as count FROM clients');
      const [fournisseurs] = await connection.query('SELECT COUNT(*) as count FROM fournisseurs');
      
      console.log(`   - Clients: ${clients[0].count}`);
      console.log(`   - Fournisseurs: ${fournisseurs[0].count}`);
    } catch (error) {
      console.log('⚠️  Could not verify sample data:', error.message);
    }

    console.log('\n🚀 Phase 1 of enhanced schema applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Apply remaining modules (reparations, cheques, caisse, etc.)');
    console.log('   2. Update TypeScript interfaces');
    console.log('   3. Create API endpoints');

    await connection.end();
  } catch (error) {
    console.error('❌ Error applying enhanced schema:', error);
    process.exit(1);
  }
}

applySchemaStepByStep();
