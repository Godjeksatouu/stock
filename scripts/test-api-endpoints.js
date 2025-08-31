// Use built-in fetch (Node.js 18+)

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('🧪 Testing API endpoints...\n');

  // Test 1: Test stock-movements endpoint
  console.log('📋 Test 1: GET /api/stock-movements?stockId=gros');
  try {
    const response = await fetch(`${baseUrl}/stock-movements?stockId=gros`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.data ? data.data.length : 0} movements`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 2: Test products endpoint
  console.log('📋 Test 2: GET /api/products?stockId=gros');
  try {
    const response = await fetch(`${baseUrl}/products?stockId=gros`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.data ? data.data.length : 0} products`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 3: Test stocks endpoint
  console.log('📋 Test 3: GET /api/stocks');
  try {
    const response = await fetch(`${baseUrl}/stocks`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.data ? data.data.length : 0} stocks`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('');

  // Test 4: Test a non-existent endpoint
  console.log('📋 Test 4: GET /api/non-existent');
  try {
    const response = await fetch(`${baseUrl}/non-existent`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`   Response preview: ${text.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('\n🎉 API endpoint testing completed!');
  console.log('\n📝 If you see JSON parsing errors in the browser:');
  console.log('   1. Check the browser developer console for specific error details');
  console.log('   2. Look for 404 or 500 responses that return HTML instead of JSON');
  console.log('   3. The improved error handling should now show better error messages');
}

// Wait a moment for the server to be ready
setTimeout(testAPIEndpoints, 3000);
