// Use built-in fetch (Node.js 18+)

async function testCashierAPI() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing Cashier System API calls...\n');

  // Test 1: Test product search by barcode
  console.log('📋 Test 1: GET /api/products/search?barcode=1234567890123');
  try {
    const response = await fetch(`${baseUrl}/products/search?barcode=1234567890123`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: ${data.data ? 'Product found' : 'No product found'}`);
      if (data.data) {
        console.log(`   Product: ${data.data.name} - ${data.data.price}`);
      }
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 2: Test product search by reference
  console.log('📋 Test 2: GET /api/products/search?reference=REF001');
  try {
    const response = await fetch(`${baseUrl}/products/search?reference=REF001`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: ${data.data ? 'Product found' : 'No product found'}`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 3: Test cashier sale creation (simulating cashier system data)
  console.log('📋 Test 3: POST /api/sales (cashier system format)');
  try {
    const cashierSaleData = {
      user_id: 1,
      stock_id: 2, // renaissance
      items: [
        {
          product_id: 1,
          quantity: 2,
          unit_price: 25.50
        }
      ]
    };

    const response = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cashierSaleData)
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

  // Test 4: Test invoice creation
  console.log('📋 Test 4: POST /api/invoices (for sale)');
  try {
    const invoiceData = {
      sale_id: 1
    };

    const response = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Created invoice ${data.data ? data.data.invoice_number : 'unknown'}`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 500)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 5: Test with invalid product search
  console.log('📋 Test 5: GET /api/products/search (no parameters)');
  try {
    const response = await fetch(`${baseUrl}/products/search`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`   Response: ${text.substring(0, 200)}`);
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('\n🎉 Cashier API testing completed!');
}

// Wait a moment for the server to be ready
setTimeout(testCashierAPI, 2000);
