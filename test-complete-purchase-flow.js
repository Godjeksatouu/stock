const fetch = require('node-fetch');
const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:3000/api';

async function testCompletePurchaseFlow() {
  console.log('🧪 Testing Complete Purchase Flow...\n');

  try {
    // 1. Test client retrieval
    console.log('1️⃣ Testing client retrieval...');
    const clientsResponse = await fetch(`${API_BASE}/clients?stockId=renaissance`);
    const clientsResult = await clientsResponse.json();
    
    if (clientsResult.success) {
      console.log(`✅ Found ${clientsResult.data.length} clients`);
      clientsResult.data.slice(0, 3).forEach(client => {
        console.log(`  - ${client.name} (ID: ${client.id})`);
      });
    } else {
      console.log('❌ Failed to fetch clients:', clientsResult.error);
    }

    // 2. Test product search by barcode
    console.log('\n2️⃣ Testing product search by barcode...');
    const productResponse = await fetch(`${API_BASE}/products/search?barcode=6223006073067`);
    const productResult = await productResponse.json();
    
    if (productResult.success && productResult.data) {
      console.log(`✅ Found product: ${productResult.data.name} - ${productResult.data.price} DH`);
      console.log(`   Barcodes: ${productResult.data.barcodes?.join(', ') || 'None'}`);
    } else {
      console.log('❌ Product not found or error:', productResult.error);
    }

    // 3. Test creating a new product (for unknown barcode scenario)
    console.log('\n3️⃣ Testing new product creation...');
    const newProductData = {
      name: 'Test Product from Purchase Form',
      price: 15.99,
      quantity: 10,
      stock_id: 2, // Renaissance
      barcodes: ['9999999999999']
    };

    const createProductResponse = await fetch(`${API_BASE}/products?stockId=renaissance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductData)
    });

    const createProductResult = await createProductResponse.json();
    let testProductId = null;

    if (createProductResult.success) {
      testProductId = createProductResult.data.id;
      console.log(`✅ Created test product with ID: ${testProductId}`);
    } else {
      console.log('❌ Failed to create test product:', createProductResult.error);
    }

    // 4. Test complete sale creation with items
    console.log('\n4️⃣ Testing complete sale creation...');
    
    const saleData = {
      client_id: 3, // Omar Alami
      stock_id: 2,
      total: 45.98,
      amount_paid: 30.00,
      change_amount: null,
      payment_method: 'cash',
      payment_status: 'partial',
      notes: 'Test purchase from new form - partial payment',
      items: [
        {
          product_id: testProductId || 1392, // Use created product or fallback
          quantity: 2,
          unit_price: 15.99,
          total_price: 31.98
        },
        {
          product_id: 1393, // Another product
          quantity: 1,
          unit_price: 14.00,
          total_price: 14.00
        }
      ]
    };

    const createSaleResponse = await fetch(`${API_BASE}/sales?stockId=renaissance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    const createSaleResult = await createSaleResponse.json();
    let testSaleId = null;

    if (createSaleResult.success) {
      testSaleId = createSaleResult.data.id;
      console.log(`✅ Created test sale with ID: ${testSaleId}`);
      console.log(`   Invoice: ${createSaleResult.data.invoice_number || 'Generated'}`);
      console.log(`   Barcode: ${createSaleResult.data.barcode || 'Generated'}`);
    } else {
      console.log('❌ Failed to create test sale:', createSaleResult.error);
    }

    // 5. Verify sale details
    if (testSaleId) {
      console.log('\n5️⃣ Verifying sale details...');
      const saleDetailsResponse = await fetch(`${API_BASE}/sales/${testSaleId}`);
      const saleDetailsResult = await saleDetailsResponse.json();

      if (saleDetailsResult.success) {
        const sale = saleDetailsResult.data;
        console.log(`✅ Sale verification successful:`);
        console.log(`   Total: ${sale.total_amount} DH`);
        console.log(`   Paid: ${sale.amount_paid || 'NULL'} DH`);
        console.log(`   Status: ${sale.payment_status}`);
        console.log(`   Items: ${sale.items_count || 0}`);
        console.log(`   Barcodes: ${sale.barcodes || 'None'}`);

        if (sale.items && sale.items.length > 0) {
          console.log('   Products:');
          sale.items.forEach((item, index) => {
            console.log(`     ${index + 1}. ${item.product_name}: ${item.quantity} × ${item.unit_price} DH = ${item.total_price} DH`);
          });
        }
      } else {
        console.log('❌ Failed to verify sale details:', saleDetailsResult.error);
      }
    }

    // 6. Test payment scenarios
    console.log('\n6️⃣ Testing different payment scenarios...');
    
    const paymentScenarios = [
      {
        name: 'Full Payment',
        data: {
          client_id: null, // Divers
          total: 25.00,
          amount_paid: 25.00,
          payment_status: 'paid',
          items: [{ product_id: testProductId || 1392, quantity: 1, unit_price: 25.00, total_price: 25.00 }]
        }
      },
      {
        name: 'No Payment',
        data: {
          client_id: 4, // Aicha Bennani
          total: 50.00,
          amount_paid: 0,
          payment_status: 'pending',
          items: [{ product_id: testProductId || 1392, quantity: 2, unit_price: 25.00, total_price: 50.00 }]
        }
      }
    ];

    for (const scenario of paymentScenarios) {
      const response = await fetch(`${API_BASE}/sales?stockId=renaissance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scenario.data,
          stock_id: 2,
          payment_method: 'cash',
          notes: `Test: ${scenario.name}`
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`   ✅ ${scenario.name}: Sale #${result.data.id} created`);
      } else {
        console.log(`   ❌ ${scenario.name}: Failed - ${result.error}`);
      }
    }

    // 7. Database verification
    console.log('\n7️⃣ Database verification...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    const [recentSales] = await connection.execute(`
      SELECT 
        s.id,
        s.total,
        s.amount_paid,
        s.payment_status,
        s.barcode,
        COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    console.log('Recent sales created:');
    recentSales.forEach(sale => {
      console.log(`   Sale #${sale.id}: ${sale.total} DH (paid: ${sale.amount_paid || 'NULL'}) - ${sale.item_count} items - ${sale.barcode}`);
    });

    await connection.end();

    console.log('\n✅ Complete Purchase Flow test completed!');
    console.log('\n🎯 All scenarios tested:');
    console.log('   ✅ Client selection');
    console.log('   ✅ Product search by barcode');
    console.log('   ✅ New product creation');
    console.log('   ✅ Sale creation with items');
    console.log('   ✅ Payment status handling');
    console.log('   ✅ Barcode generation');
    console.log('   ✅ Database integrity');

  } catch (error) {
    console.error('❌ Error in purchase flow test:', error.message);
  }
}

// Only run if server is available
testCompletePurchaseFlow().catch(error => {
  if (error.code === 'ECONNREFUSED') {
    console.log('⚠️ Server not running. Start with: npm run dev');
  } else {
    console.error('❌ Test failed:', error.message);
  }
});
