const mysql = require('mysql2/promise');

async function testBarcodes() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔍 Testing barcode functionality...');

    // Check if barcode column exists in sales table
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sales' 
      AND COLUMN_NAME = 'barcode'
    `);

    if (columns.length === 0) {
      console.log('❌ Barcode column does not exist in sales table');
    } else {
      console.log('✅ Barcode column exists:', columns[0]);
    }

    // Check recent sales with barcodes
    const [sales] = await connection.execute(`
      SELECT 
        s.id, 
        s.barcode as sale_barcode, 
        s.total, 
        s.created_at,
        GROUP_CONCAT(DISTINCT sb.barcode) as product_barcodes
      FROM sales s
      LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    console.log('📊 Recent sales with barcodes:');
    sales.forEach(sale => {
      console.log(`  Sale #${sale.id}: Sale barcode=${sale.sale_barcode || 'NULL'}, Product barcodes=${sale.product_barcodes || 'NULL'}`);
    });

    // Check sale_barcodes table
    const [saleBarcodesCount] = await connection.execute('SELECT COUNT(*) as count FROM sale_barcodes');
    console.log(`📦 Total product barcodes in sale_barcodes table: ${saleBarcodesCount[0].count}`);

    // Test barcode search functionality
    console.log('\n🔍 Testing barcode search...');
    
    // Find a sale with a barcode to test search
    const [saleWithBarcode] = await connection.execute(`
      SELECT s.id, s.barcode 
      FROM sales s 
      WHERE s.barcode IS NOT NULL 
      LIMIT 1
    `);

    if (saleWithBarcode.length > 0) {
      const testBarcode = saleWithBarcode[0].barcode;
      console.log(`Testing search with barcode: ${testBarcode}`);
      
      const [searchResults] = await connection.execute(`
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
      `, [`%${testBarcode}%`, `%${testBarcode}%`]);

      console.log(`✅ Search found ${searchResults.length} results`);
      searchResults.forEach(result => {
        console.log(`  Found sale #${result.id} with barcodes: ${result.barcodes}`);
      });
    } else {
      console.log('⚠️ No sales with barcodes found to test search');
    }

    await connection.end();
    console.log('\n✅ Barcode functionality test completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBarcodes();
