// Use built-in fetch (Node.js 18+)

async function testSalesAPI() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing Sales API...\n');

  // Test 1: Test GET sales endpoint
  console.log('📋 Test 1: GET /api/sales?stockId=gros');
  try {
    const response = await fetch(`${baseUrl}/sales?stockId=gros`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.data ? data.data.length : 0} sales`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 2: Test POST sales endpoint with minimal data
  console.log('📋 Test 2: POST /api/sales (minimal data)');
  try {
    const testSaleData = {
      user_id: 1,
      stock_id: 3, // gros
      items: [
        {
          product_id: 1,
          quantity: 1,
          unit_price: 10.00
        }
      ]
    };

    const response = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSaleData)
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Created sale with ID ${data.data ? data.data.id : 'unknown'}`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 500)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 3: Test POST sales endpoint with enhanced data
  console.log('📋 Test 3: POST /api/sales (enhanced data)');
  try {
    const testEnhancedSaleData = {
      user_id: 1,
      stock_id: 3, // gros
      client_id: null,
      payment_method: 'cash',
      payment_status: 'paid',
      notes: 'Test sale from API test',
      items: [
        {
          product_id: 1,
          quantity: 2,
          unit_price: 15.50
        }
      ]
    };

    const response = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEnhancedSaleData)
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Created enhanced sale with ID ${data.data ? data.data.id : 'unknown'}`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 500)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 4: Test POST sales endpoint with invalid data
  console.log('📋 Test 4: POST /api/sales (invalid data - missing user_id)');
  try {
    const testInvalidSaleData = {
      stock_id: 3,
      items: [
        {
          product_id: 1,
          quantity: 1,
          unit_price: 10.00
        }
      ]
    };

    const response = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testInvalidSaleData)
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`   Response: ${text.substring(0, 200)}`);
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('\n🎉 Sales API testing completed!');
}

// Wait a moment for the server to be ready
setTimeout(testSalesAPI, 2000);
