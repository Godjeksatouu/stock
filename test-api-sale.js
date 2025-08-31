const http = require('http');

async function testAPISale() {
  try {
    console.log('🧪 Testing API sale creation...');

    const saleData = {
      client_id: null, // Client Divers
      stock_id: 2, // Renaissance
      total: 25.50,
      amount_paid: 25.50,
      change_amount: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      notes: 'Test sale from API test',
      items: [
        {
          product_id: 2, // Existing product (Stylo Bic Bleu)
          quantity: 1,
          unit_price: 25.50,
          total_price: 25.50
        }
      ]
    };

    const postData = JSON.stringify(saleData);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/sales?stockId=renaissance',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Node.js Test Client',
        'Cookie': 'auth-token=test' // Add some auth if needed
      }
    };

    console.log('📤 Sending sale data:', JSON.stringify(saleData, null, 2));

    const req = http.request(options, (res) => {
      console.log('📥 Response status:', res.statusCode);
      console.log('📥 Response headers:', res.headers);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
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
          console.log('❌ Error parsing response:', error.message);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.error('❌ Error testing API sale:', error.message);
  }
}

testAPISale();
