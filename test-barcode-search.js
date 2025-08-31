const mysql = require('mysql2/promise');

async function testBarcodeSearch() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔍 Testing barcode search functionality...\n');

    // 1. Get some sample barcodes to test with
    console.log('📊 Getting sample barcodes for testing...');
    
    // Get sale barcodes
    const [saleBarcodes] = await connection.execute(`
      SELECT id, barcode, total 
      FROM sales 
      WHERE barcode IS NOT NULL 
      LIMIT 3
    `);

    console.log('Sale barcodes found:');
    saleBarcodes.forEach(sale => {
      console.log(`  - Sale #${sale.id}: ${sale.barcode} (${sale.total} DH)`);
    });

    // Get product barcodes
    const [productBarcodes] = await connection.execute(`
      SELECT DISTINCT sb.barcode, sb.sale_id, p.name 
      FROM sale_barcodes sb
      JOIN products p ON sb.product_id = p.id
      LIMIT 3
    `);

    console.log('\nProduct barcodes found:');
    productBarcodes.forEach(item => {
      console.log(`  - Product "${item.name}": ${item.barcode} (in sale #${item.sale_id})`);
    });

    // 2. Test sale barcode search
    if (saleBarcodes.length > 0) {
      const testSaleBarcode = saleBarcodes[0].barcode;
      console.log(`\n🔍 Testing sale barcode search with: ${testSaleBarcode}`);
      
      const [saleSearchResults] = await connection.execute(`
        SELECT 
          s.id,
          s.barcode as sale_barcode,
          s.total,
          CASE
            WHEN s.barcode IS NOT NULL AND GROUP_CONCAT(DISTINCT sb.barcode) IS NOT NULL
            THEN CONCAT(s.barcode, ',', GROUP_CONCAT(DISTINCT sb.barcode))
            WHEN s.barcode IS NOT NULL
            THEN s.barcode
            WHEN GROUP_CONCAT(DISTINCT sb.barcode) IS NOT NULL
            THEN GROUP_CONCAT(DISTINCT sb.barcode)
            ELSE NULL
          END as barcodes
        FROM sales s
        LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id
        WHERE (
          s.barcode LIKE ? OR
          EXISTS (
            SELECT 1 FROM sale_barcodes sb2
            WHERE sb2.sale_id = s.id AND sb2.barcode LIKE ?
          )
        )
        GROUP BY s.id
      `, [`%${testSaleBarcode}%`, `%${testSaleBarcode}%`]);

      console.log(`✅ Sale barcode search found ${saleSearchResults.length} results:`);
      saleSearchResults.forEach(result => {
        console.log(`  - Sale #${result.id}: ${result.barcodes}`);
      });
    }

    // 3. Test product barcode search
    if (productBarcodes.length > 0) {
      const testProductBarcode = productBarcodes[0].barcode;
      console.log(`\n🔍 Testing product barcode search with: ${testProductBarcode}`);
      
      const [productSearchResults] = await connection.execute(`
        SELECT 
          s.id,
          s.barcode as sale_barcode,
          s.total,
          CASE
            WHEN s.barcode IS NOT NULL AND GROUP_CONCAT(DISTINCT sb.barcode) IS NOT NULL
            THEN CONCAT(s.barcode, ',', GROUP_CONCAT(DISTINCT sb.barcode))
            WHEN s.barcode IS NOT NULL
            THEN s.barcode
            WHEN GROUP_CONCAT(DISTINCT sb.barcode) IS NOT NULL
            THEN GROUP_CONCAT(DISTINCT sb.barcode)
            ELSE NULL
          END as barcodes
        FROM sales s
        LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id
        WHERE (
          s.barcode LIKE ? OR
          EXISTS (
            SELECT 1 FROM sale_barcodes sb2
            WHERE sb2.sale_id = s.id AND sb2.barcode LIKE ?
          )
        )
        GROUP BY s.id
      `, [`%${testProductBarcode}%`, `%${testProductBarcode}%`]);

      console.log(`✅ Product barcode search found ${productSearchResults.length} results:`);
      productSearchResults.forEach(result => {
        console.log(`  - Sale #${result.id}: ${result.barcodes}`);
      });
    }

    // 4. Test partial barcode search
    if (saleBarcodes.length > 0) {
      const fullBarcode = saleBarcodes[0].barcode;
      const partialBarcode = fullBarcode.substring(0, 8); // First 8 characters
      console.log(`\n🔍 Testing partial barcode search with: ${partialBarcode}`);
      
      const [partialSearchResults] = await connection.execute(`
        SELECT 
          s.id,
          s.barcode as sale_barcode,
          s.total
        FROM sales s
        WHERE s.barcode LIKE ?
      `, [`%${partialBarcode}%`]);

      console.log(`✅ Partial barcode search found ${partialSearchResults.length} results:`);
      partialSearchResults.forEach(result => {
        console.log(`  - Sale #${result.id}: ${result.sale_barcode}`);
      });
    }

    await connection.end();
    console.log('\n✅ Barcode search functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing barcode search:', error.message);
  }
}

testBarcodeSearch();
