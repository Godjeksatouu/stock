const fetch = require('node-fetch');

async function testBarcodeDisplay() {
  try {
    console.log('🔍 Testing Sales API for barcode display...');
    
    const response = await fetch('http://localhost:3000/api/sales?limit=5');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ API call successful');
      console.log(`📊 Found ${result.data.sales.length} sales`);
      console.log('');
      
      result.data.sales.forEach(sale => {
        console.log(`Sale #${sale.id}:`);
        console.log(`  - Sale barcode: ${sale.sale_barcode || 'NULL'}`);
        console.log(`  - Product barcodes: ${sale.product_barcodes || 'NULL'}`);
        console.log(`  - Combined barcodes: ${sale.barcodes || 'NULL'}`);
        console.log(`  - Total: ${sale.total_amount} DH`);
        console.log(`  - Date: ${sale.created_at}`);
        console.log('');
      });

      // Test barcode search
      console.log('🔍 Testing barcode search...');
      const searchResponse = await fetch('http://localhost:3000/api/sales?barcode=20250807000020');
      const searchResult = await searchResponse.json();
      
      if (searchResult.success) {
        console.log(`✅ Barcode search successful - found ${searchResult.data.sales.length} results`);
        searchResult.data.sales.forEach(sale => {
          console.log(`  Found sale #${sale.id} with barcodes: ${sale.barcodes}`);
        });
      } else {
        console.log('❌ Barcode search failed:', searchResult.error);
      }
      
    } else {
      console.log('❌ API call failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
    console.log('⚠️ Make sure the development server is running (npm run dev)');
  }
}

testBarcodeDisplay();
