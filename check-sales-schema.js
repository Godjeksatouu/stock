const mysql = require('mysql2/promise');

async function checkSalesSchema() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'stock'
    });

    console.log('🔍 Checking sales table schema...');
    
    // Get table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'stock' 
      AND TABLE_NAME = 'sales'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📊 Sales table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT || 'NULL'})`);
    });

    // Check sample data
    console.log('\n📋 Sample sales data:');
    const [sales] = await connection.execute(`
      SELECT id, total, amount_paid, change_amount, payment_method, payment_status, barcode
      FROM sales 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    sales.forEach(sale => {
      console.log(`  Sale #${sale.id}: total=${sale.total}, paid=${sale.amount_paid || 'NULL'}, change=${sale.change_amount || 'NULL'}, status=${sale.payment_status}`);
    });

    // Check sale_barcodes table
    console.log('\n🔍 Checking sale_barcodes table...');
    const [saleBarcodesCount] = await connection.execute('SELECT COUNT(*) as count FROM sale_barcodes');
    console.log(`📦 Total product barcodes stored: ${saleBarcodesCount[0].count}`);

    // Check recent sale with product barcodes
    const [saleWithProducts] = await connection.execute(`
      SELECT 
        s.id,
        s.barcode as sale_barcode,
        GROUP_CONCAT(DISTINCT CONCAT(p.name, ':', sb.barcode) SEPARATOR '; ') as product_barcodes
      FROM sales s
      LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id
      LEFT JOIN products p ON sb.product_id = p.id
      WHERE sb.barcode IS NOT NULL
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 3
    `);

    console.log('\n📋 Recent sales with product barcodes:');
    saleWithProducts.forEach(sale => {
      console.log(`  Sale #${sale.id} (${sale.sale_barcode}): ${sale.product_barcodes || 'No products'}`);
    });

    await connection.end();
    console.log('\n✅ Schema check completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSalesSchema();
