const fetch = require('node-fetch');

async function testSaleCreation() {
  try {
    console.log('🧪 Testing sale creation...');

    const saleData = {
      client_id: null, // Client Divers
      stock_id: 2, // Renaissance
      total: 25.50,
      amount_paid: 25.50,
      change_amount: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      notes: 'Test sale from new purchase form',
      items: [
        {
          product_id: 1392, // Existing product
          quantity: 1,
          unit_price: 25.50,
          total_price: 25.50
        }
      ]
    };

    console.log('📤 Sending sale data:', JSON.stringify(saleData, null, 2));

    const response = await fetch('http://localhost:3001/api/sales?stockId=renaissance', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=test' // Add some auth if needed
      },
      body: JSON.stringify(saleData)
    });

    const result = await response.json();

    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Sale created successfully!');
      console.log(`   Sale ID: ${result.data.id}`);
      console.log(`   Invoice: ${result.data.invoice_number || 'Generated'}`);
      console.log(`   Barcode: ${result.data.barcode || 'Generated'}`);
    } else {
      console.log('❌ Sale creation failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing sale creation:', error.message);
  }
}

testSaleCreation();
