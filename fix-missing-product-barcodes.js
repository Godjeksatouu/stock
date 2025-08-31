const mysql = require('mysql2/promise');

async function fixMissingProductBarcodes() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔧 Fixing missing product barcodes in sales...\n');

    // Find sales with products that don't have barcodes stored in sale_barcodes
    const [missingBarcodes] = await connection.execute(`
      SELECT 
        s.id as sale_id,
        si.product_id,
        si.quantity,
        p.name as product_name
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id AND si.product_id = sb.product_id
      WHERE sb.id IS NULL
      ORDER BY s.created_at DESC
    `);

    console.log(`📋 Found ${missingBarcodes.length} sale items missing product barcodes`);

    if (missingBarcodes.length === 0) {
      console.log('✅ No missing product barcodes found!');
      await connection.end();
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;

    for (const item of missingBarcodes) {
      console.log(`\n🔍 Processing Sale #${item.sale_id} - Product: ${item.product_name} (ID: ${item.product_id})`);

      // Get all barcodes for this product
      const [productBarcodes] = await connection.execute(`
        SELECT code FROM barcodes WHERE product_id = ?
      `, [item.product_id]);

      if (productBarcodes.length === 0) {
        console.log(`  ⚠️ No barcodes found for product ${item.product_name} - skipping`);
        skippedCount++;
        continue;
      }

      // Insert all barcodes for this product in this sale
      for (const barcodeRow of productBarcodes) {
        try {
          await connection.execute(`
            INSERT INTO sale_barcodes (sale_id, product_id, barcode, quantity) 
            VALUES (?, ?, ?, ?)
          `, [item.sale_id, item.product_id, barcodeRow.code, item.quantity]);

          console.log(`  ✅ Added barcode ${barcodeRow.code} for product ${item.product_name} in sale #${item.sale_id}`);
          fixedCount++;
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            console.log(`  ℹ️ Barcode ${barcodeRow.code} already exists for this sale - skipping`);
          } else {
            console.log(`  ❌ Error adding barcode ${barcodeRow.code}:`, error.message);
          }
        }
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const [remainingMissing] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id AND si.product_id = sb.product_id
      WHERE sb.id IS NULL
    `);

    console.log(`\n📊 Summary:`);
    console.log(`  - Product barcodes added: ${fixedCount}`);
    console.log(`  - Items skipped (no barcodes available): ${skippedCount}`);
    console.log(`  - Remaining missing: ${remainingMissing[0].count}`);

    // Show some examples of fixed sales
    console.log('\n📋 Sample of fixed sales:');
    const [fixedSamples] = await connection.execute(`
      SELECT 
        s.id as sale_id,
        s.barcode as sale_barcode,
        p.name as product_name,
        GROUP_CONCAT(DISTINCT sb.barcode) as product_barcodes
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      JOIN sale_barcodes sb ON s.id = sb.sale_id AND si.product_id = sb.product_id
      GROUP BY s.id, p.name
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    fixedSamples.forEach(sample => {
      console.log(`  Sale #${sample.sale_id} (${sample.sale_barcode}): ${sample.product_name} - Barcodes: ${sample.product_barcodes}`);
    });

    await connection.end();
    console.log('\n✅ Product barcode fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing product barcodes:', error.message);
  }
}

fixMissingProductBarcodes();
