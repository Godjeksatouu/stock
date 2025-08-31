const mysql = require('mysql2/promise');

async function checkBarcodeTables() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock'
    });

    console.log('🔍 Checking barcode-related tables and columns...\n');

    // Check if sale_barcodes table exists
    console.log('📋 Checking sale_barcodes table...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sale_barcodes'
      `, [process.env.DB_NAME || 'stock']);

      if (tables.length > 0) {
        console.log('✅ sale_barcodes table exists');
        
        // Check table structure
        const [columns] = await connection.execute('DESCRIBE sale_barcodes');
        console.log('📋 sale_barcodes table structure:');
        columns.forEach(col => {
          console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });

        // Check sample data
        const [sampleData] = await connection.execute('SELECT COUNT(*) as count FROM sale_barcodes');
        console.log(`📊 Total barcodes in sale_barcodes: ${sampleData[0].count}`);
      } else {
        console.log('❌ sale_barcodes table does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking sale_barcodes table:', error.message);
    }

    // Check sales table structure
    console.log('\n📋 Checking sales table structure...');
    try {
      const [columns] = await connection.execute('DESCRIBE sales');
      console.log('📋 sales table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
      });

      // Check if invoice_number column exists
      const hasInvoiceNumber = columns.some(col => col.Field === 'invoice_number');
      console.log(`📄 invoice_number column: ${hasInvoiceNumber ? '✅ exists' : '❌ missing'}`);

      // Check sample sales data
      const [salesData] = await connection.execute(`
        SELECT COUNT(*) as total_sales,
               COUNT(invoice_number) as sales_with_invoice
        FROM sales
      `);
      console.log(`📊 Total sales: ${salesData[0].total_sales}`);
      console.log(`📊 Sales with invoice numbers: ${salesData[0].sales_with_invoice}`);

    } catch (error) {
      console.log('❌ Error checking sales table:', error.message);
    }

    // Check recent sales with barcodes
    console.log('\n📋 Checking recent sales with barcodes...');
    try {
      const [recentSales] = await connection.execute(`
        SELECT s.id, s.invoice_number, s.total, s.created_at,
               GROUP_CONCAT(sb.barcode) as barcodes
        FROM sales s
        LEFT JOIN sale_barcodes sb ON s.id = sb.sale_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 5
      `);

      if (recentSales.length > 0) {
        console.log('📊 Recent sales with barcode data:');
        recentSales.forEach(sale => {
          console.log(`   Sale #${sale.id} (${sale.invoice_number || 'No invoice'}): ${sale.total} DH`);
          console.log(`     Barcodes: ${sale.barcodes || 'None'}`);
          console.log(`     Date: ${sale.created_at}`);
        });
      } else {
        console.log('📊 No sales found');
      }
    } catch (error) {
      console.log('❌ Error checking recent sales:', error.message);
    }

    await connection.end();
    console.log('\n🎉 Barcode tables check completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBarcodeTables();
