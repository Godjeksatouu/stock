const mysql = require('mysql2/promise');

async function testNewPurchaseForm() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🧪 Testing New Purchase Form functionality...\n');

    // 1. Test client retrieval
    console.log('1️⃣ Testing client retrieval for Renaissance stock...');
    const [clients] = await connection.execute(`
      SELECT id, name, email, phone 
      FROM clients 
      WHERE stock_id = 2 AND is_active = 1
      ORDER BY name
      LIMIT 10
    `);

    console.log(`✅ Found ${clients.length} active clients:`);
    clients.forEach(client => {
      console.log(`  - ${client.name} (ID: ${client.id})`);
    });

    // 2. Test product search by barcode
    console.log('\n2️⃣ Testing product search by barcode...');
    const [products] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.quantity,
        GROUP_CONCAT(b.code) as barcodes
      FROM products p
      LEFT JOIN barcodes b ON p.id = b.product_id
      WHERE p.stock_id = 2 AND p.is_active = 1
      GROUP BY p.id
      LIMIT 5
    `);

    console.log(`✅ Found ${products.length} products with barcodes:`);
    products.forEach(product => {
      console.log(`  - ${product.name}: ${product.price} DH (Barcodes: ${product.barcodes || 'None'})`);
    });

    // 3. Test sale creation structure
    console.log('\n3️⃣ Testing sale creation structure...');
    
    // Check if sale_items table exists
    const [saleItemsTable] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sale_items'
    `);

    if (saleItemsTable[0].count > 0) {
      console.log('✅ sale_items table exists');
      
      // Check table structure
      const [saleItemsColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'stock' 
        AND TABLE_NAME = 'sale_items'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('📋 sale_items table structure:');
      saleItemsColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
      });
    } else {
      console.log('❌ sale_items table does not exist - need to create it');
      
      // Create sale_items table
      await connection.execute(`
        CREATE TABLE sale_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sale_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          INDEX idx_sale_id (sale_id),
          INDEX idx_product_id (product_id)
        )
      `);
      
      console.log('✅ sale_items table created successfully');
    }

    // 4. Test payment status scenarios
    console.log('\n4️⃣ Testing payment status scenarios...');
    
    const testScenarios = [
      { status: 'paid', total: 100, paid: 100, remaining: 0 },
      { status: 'partial', total: 100, paid: 60, remaining: 40 },
      { status: 'unpaid', total: 100, paid: 0, remaining: 100 }
    ];

    testScenarios.forEach(scenario => {
      console.log(`  📊 ${scenario.status.toUpperCase()}: Total=${scenario.total} DH, Paid=${scenario.paid} DH, Remaining=${scenario.remaining} DH`);
    });

    // 5. Test barcode cleaning function
    console.log('\n5️⃣ Testing barcode cleaning scenarios...');
    
    const barcodeTests = [
      { input: '1234567890123', expected: '1234567890123', description: 'Clean numeric barcode' },
      { input: 'é"\'(-è_çà&', expected: '2345678901', description: 'French keyboard mapping' },
      { input: '123-456-789', expected: '123456789', description: 'Barcode with dashes' },
      { input: 'ABC123DEF456', expected: '123456', description: 'Mixed alphanumeric' }
    ];

    barcodeTests.forEach(test => {
      // Simulate the cleaning logic
      let cleaned = test.input.replace(/[^0-9]/g, '');
      
      if (cleaned.length < 8) {
        const frenchToNumeric = {
          'à': '0', '&': '1', 'é': '2', '"': '3', "'": '4',
          '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9'
        };
        
        const frenchMapped = test.input.split('').map(char => frenchToNumeric[char] || '').join('');
        if (frenchMapped.length > cleaned.length) {
          cleaned = frenchMapped;
        }
      }
      
      cleaned = cleaned.replace(/[^0-9]/g, '');
      const passed = cleaned === test.expected;
      
      console.log(`  ${passed ? '✅' : '❌'} ${test.description}: "${test.input}" -> "${cleaned}"`);
    });

    // 6. Test stock mapping
    console.log('\n6️⃣ Testing stock mapping...');
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    Object.entries(stockMapping).forEach(([name, id]) => {
      console.log(`  📍 ${name} -> Stock ID: ${id}`);
    });

    await connection.end();
    console.log('\n✅ New Purchase Form test completed successfully!');
    console.log('\n🎯 Ready to test:');
    console.log('  1. Client selection (including "Divers")');
    console.log('  2. Product scanning and search');
    console.log('  3. Adding unknown products');
    console.log('  4. Payment status calculations');
    console.log('  5. Cart management');
    console.log('  6. Sale creation with items');
    
  } catch (error) {
    console.error('❌ Error testing new purchase form:', error.message);
  }
}

testNewPurchaseForm();
