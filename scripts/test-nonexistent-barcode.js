const baseUrl = 'http://localhost:3001';

async function testNonExistentBarcode() {
  console.log('🔍 Testing search for non-existent barcode');
  
  try {
    const response = await fetch(`${baseUrl}/api/products/search?barcode=6223006073067`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testNonExistentBarcode();
