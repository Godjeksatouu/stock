const mysql = require('mysql2/promise');

async function testSalesHistoryBarcodes() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔍 Testing Sales History Barcode Functionality...\n');

    // 1. Check if sales have proper amount_paid values
    console.log('1️⃣ Checking amount_paid values in sales...');
    const [salesWithAmountPaid] = await connection.execute(`
      SELECT id, total, amount_paid, change_amount, payment_status
      FROM sales 
      WHERE amount_paid IS NOT NULL AND amount_paid > 0
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`Found ${salesWithAmountPaid.length} sales with amount_paid > 0:`);
    salesWithAmountPaid.forEach(sale => {
      console.log(`  Sale #${sale.id}: total=${sale.total}, paid=${sale.amount_paid}, change=${sale.change_amount}, status=${sale.payment_status}`);
    });

    // 2. Check sales with NULL amount_paid (should not show "0")
    const [salesWithNullAmountPaid] = await connection.execute(`
      SELECT id, total, amount_paid, change_amount, payment_status
      FROM sales 
      WHERE amount_paid IS NULL
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`\nFound ${salesWithNullAmountPaid.length} sales with NULL amount_paid (should not display "Payé: 0"):`);
    salesWithNullAmountPaid.forEach(sale => {
      console.log(`  Sale #${sale.id}: total=${sale.total}, paid=${sale.amount_paid || 'NULL'}, status=${sale.payment_status}`);
    });

    // 3. Test individual sale details API
    console.log('\n2️⃣ Testing individual sale details with products and barcodes...');
    
    // Get a sale that has products
    const [saleWithProducts] = await connection.execute(`
      SELECT DISTINCT s.id
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      ORDER BY s.created_at DESC
      LIMIT 1
    `);

    if (saleWithProducts.length > 0) {
      const saleId = saleWithProducts[0].id;
      console.log(`Testing sale #${saleId}...`);

      // Test the API endpoint
      try {
        const fetch = require('node-fetch');
        const response = await fetch(`http://localhost:3000/api/sales/${saleId}`);
        const result = await response.json();

        if (result.success) {
          console.log('✅ Sale details API working:');
          console.log(`  - Sale ID: ${result.data.id}`);
          console.log(`  - Sale barcode: ${result.data.sale_barcode || 'NULL'}`);
          console.log(`  - Items count: ${result.data.items_count}`);
          console.log(`  - Total quantity: ${result.data.total_quantity}`);
          console.log(`  - Combined barcodes: ${result.data.barcodes || 'NULL'}`);
          
          if (result.data.items && result.data.items.length > 0) {
            console.log('  - Products:');
            result.data.items.forEach((item, index) => {
              console.log(`    ${index + 1}. ${item.product_name} (${item.quantity}x ${item.unit_price} DH)`);
              console.log(`       Barcodes: ${item.product_barcodes || 'None'}`);
            });
          }
        } else {
          console.log('❌ Sale details API failed:', result.error);
        }
      } catch (apiError) {
        console.log('⚠️ API test skipped (server not running):', apiError.message);
      }
    } else {
      console.log('⚠️ No sales with products found for testing');
    }

    // 4. Verify barcode storage for products in sales
    console.log('\n3️⃣ Verifying product barcode storage in sales...');
    
    const [productBarcodeCheck] = await connection.execute(`
      SELECT 
        s.id as sale_id,
        s.barcode as sale_barcode,
        si.product_id,
        p.name as product_name,
        sb.barcode as product_barcode,
        si.quantity
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id AND si.product_id = sb.product_id
      ORDER BY s.created_at DESC, si.id
      LIMIT 10
    `);

    console.log('Recent sales with product barcode storage:');
    productBarcodeCheck.forEach(row => {
      console.log(`  Sale #${row.sale_id} (${row.sale_barcode}): ${row.product_name} - Barcode: ${row.product_barcode || 'NOT STORED'}`);
    });

    // 5. Check if any products are missing barcodes in sale_barcodes table
    const [missingBarcodes] = await connection.execute(`
      SELECT 
        s.id as sale_id,
        si.product_id,
        p.name as product_name,
        COUNT(sb.id) as barcode_count
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id AND si.product_id = sb.product_id
      GROUP BY s.id, si.product_id, p.name
      HAVING barcode_count = 0
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    if (missingBarcodes.length > 0) {
      console.log('\n⚠️ Products missing barcodes in sale_barcodes table:');
      missingBarcodes.forEach(row => {
        console.log(`  Sale #${row.sale_id}: ${row.product_name} (Product ID: ${row.product_id})`);
      });
    } else {
      console.log('\n✅ All products in recent sales have barcodes properly stored');
    }

    await connection.end();
    console.log('\n✅ Sales history barcode test completed!');
    
  } catch (error) {
    console.error('❌ Error testing sales history barcodes:', error.message);
  }
}

testSalesHistoryBarcodes();
