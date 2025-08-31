const http = require('http');

// Test the simplified return API
const testData = {
  original_sale_id: 2,
  stock_id: 'renaissance',
  return_type: 'refund',
  total_refund_amount: 10.50,
  total_exchange_amount: 0,
  notes: 'Test return',
  payment_method: 'cash',
  return_items: [
    {
      product_id: 1,
      quantity: 1,
      unit_price: 10.50,
      reason: 'Test reason'
    }
  ],
  exchange_items: [],
  user_id: null,
  client_id: null
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/returns/create-from-sale',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔍 Testing simplified return API...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('🎉 Return API is working!');
      } else {
        console.log('❌ Return failed:', parsed.error);
        if (parsed.details) {
          console.log('Details:', parsed.details);
        }
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(postData);
req.end();
