const mysql = require('mysql2/promise');

async function testBarcodeSaving() {
  let conn;
  try {
    console.log('🧪 Testing barcode saving functionality...');
    
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Test 1: Create a product with a barcode via API
    const testProductData = {
      name: `Test Product Barcode ${Date.now()}`,
      description: 'Test product for barcode functionality',
      price: 25.50,
      quantity: 10,
      barcodes: ['1234567890123']
    };
    
    console.log('📦 Creating product via API:', testProductData);
    
    const response = await fetch('http://localhost:3001/api/products?stockId=gros', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testProductData)
    });
    
    const result = await response.json();
    console.log('📦 API Response:', result);
    
    if (result.success) {
      const productId = result.data.id;
      console.log(`✅ Product created with ID: ${productId}`);
      
      // Test 2: Check if barcode was saved in database
      const [barcodeRows] = await conn.execute(
        'SELECT * FROM barcodes WHERE product_id = ?',
        [productId]
      );
      
      console.log('🔍 Barcodes in database:', barcodeRows);
      
      if (barcodeRows.length > 0) {
        console.log('✅ Barcode was successfully saved!');
        console.log('📊 Barcode details:', barcodeRows[0]);
      } else {
        console.log('❌ Barcode was NOT saved to database');
      }
      
      // Test 3: Fetch product via API to see if barcode is returned
      const fetchResponse = await fetch(`http://localhost:3001/api/products/${productId}`);
      const fetchResult = await fetchResponse.json();
      
      console.log('🔍 Fetched product data:', fetchResult);
      
      if (fetchResult.success && fetchResult.data.barcodes && fetchResult.data.barcodes.length > 0) {
        console.log('✅ Barcode is returned in API response');
      } else {
        console.log('❌ Barcode is NOT returned in API response');
      }
      
      // Test 4: Search by barcode
      const searchResponse = await fetch(`http://localhost:3001/api/products/search?barcode=1234567890123`);
      const searchResult = await searchResponse.json();
      
      console.log('🔍 Search by barcode result:', searchResult);
      
      if (searchResult.success && searchResult.data) {
        console.log('✅ Product found by barcode search');
      } else {
        console.log('❌ Product NOT found by barcode search');
      }
      
    } else {
      console.log('❌ Failed to create product:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testBarcodeSaving().catch(console.error);
