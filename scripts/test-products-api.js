const baseUrl = 'http://localhost:3001';

async function testProductsAPI() {
  console.log('🧪 Testing Products API with Barcodes');
  console.log('═'.repeat(50));

  // Test 1: Get products for Al Ouloum
  console.log('\n📋 Test 1: GET /api/products?stockId=al-ouloum&limit=3');
  try {
    const response = await fetch(`${baseUrl}/api/products?stockId=al-ouloum&limit=3`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.data.products.length} products`);
      
      data.data.products.forEach((product, index) => {
        console.log(`   Product ${index + 1}:`);
        console.log(`     - Nom: ${product.name}`);
        console.log(`     - Code Barres Principal: ${product.primaryBarcode || 'Aucun'}`);
        console.log(`     - Tous les codes-barres: ${product.barcodes ? product.barcodes.join(', ') : 'Aucun'}`);
        console.log(`     - Prix: ${product.price} DH`);
        console.log(`     - Quantité: ${product.quantity}`);
      });
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  // Test 2: Create a new product with barcode
  console.log('\n📋 Test 2: POST /api/products?stockId=al-ouloum (with barcode)');
  try {
    const newProduct = {
      name: 'Test Product with Barcode',
      description: 'Product created for testing barcode functionality',
      price: 15.50,
      quantity: 10,
      barcodes: ['1234567890999']
    };

    const response = await fetch(`${baseUrl}/api/products?stockId=al-ouloum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newProduct)
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Product created with ID ${data.data.id}`);
      console.log(`   Product details:`);
      console.log(`     - Nom: ${data.data.name}`);
      console.log(`     - Prix: ${data.data.price} DH`);
      console.log(`     - Quantité: ${data.data.quantity}`);
      console.log(`     - Codes-barres: ${data.data.barcodes ? data.data.barcodes.join(', ') : 'Aucun'}`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('\n✅ API Tests completed!');
}

testProductsAPI();
