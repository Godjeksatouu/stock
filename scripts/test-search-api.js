const baseUrl = 'http://localhost:3001';

async function testSearchAPI() {
  console.log('🔍 Testing Product Search API');
  console.log('═'.repeat(50));

  // Test 1: Search by barcode
  console.log('\n📋 Test 1: Search by barcode');
  try {
    const response = await fetch(`${baseUrl}/api/products/search?barcode=3154144402101`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        console.log(`   ✅ Product found:`);
        console.log(`     - Nom: ${data.data.name}`);
        console.log(`     - Code Barres Principal: ${data.data.primaryBarcode}`);
        console.log(`     - Prix: ${data.data.price} DH`);
        console.log(`     - Stock: ${data.data.stock_name}`);
      } else {
        console.log(`   ℹ️ No product found with this barcode`);
      }
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  // Test 2: Search by barcode with stock filter
  console.log('\n📋 Test 2: Search by barcode with stock filter');
  try {
    const response = await fetch(`${baseUrl}/api/products/search?barcode=3154144402101&stockId=al-ouloum`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        console.log(`   ✅ Product found in Al Ouloum:`);
        console.log(`     - Nom: ${data.data.name}`);
        console.log(`     - Code Barres Principal: ${data.data.primaryBarcode}`);
        console.log(`     - Prix: ${data.data.price} DH`);
        console.log(`     - Quantité: ${data.data.quantity}`);
      } else {
        console.log(`   ℹ️ No product found with this barcode in Al Ouloum`);
      }
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  // Test 3: Search by our test barcode
  console.log('\n📋 Test 3: Search by test barcode');
  try {
    const response = await fetch(`${baseUrl}/api/products/search?barcode=1234567890999`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        console.log(`   ✅ Test product found:`);
        console.log(`     - Nom: ${data.data.name}`);
        console.log(`     - Code Barres Principal: ${data.data.primaryBarcode}`);
        console.log(`     - Prix: ${data.data.price} DH`);
        console.log(`     - Stock: ${data.data.stock_name}`);
      } else {
        console.log(`   ℹ️ Test product not found`);
      }
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('\n✅ Search API Tests completed!');
}

testSearchAPI();
