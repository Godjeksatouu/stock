import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating new return/exchange');

    const body = await request.json();
    console.log('🔄 Received return data:', body);

    const {
      original_sale_id,
      return_type,
      total_refund_amount,
      reason,
      customer_notes,
      items
    } = body;

    // Validate required fields
    if (!original_sale_id || !return_type || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate return type
    if (!['return', 'exchange'].includes(return_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid return type' },
        { status: 400 }
      );
    }

    // Determine existing schema for return_transactions; create minimal table if missing
    const [dbRows]: any = await pool.query(`SELECT DATABASE() AS db`);
    const dbName = Array.isArray(dbRows) && dbRows[0]?.db ? dbRows[0].db : 'stock';

    const [rtExistsRows]: any = await pool.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_transactions'`,
      [dbName]
    );
    const rtExists = Array.isArray(rtExistsRows) && (rtExistsRows[0]?.cnt || 0) > 0;

    if (!rtExists) {
      await pool.query(`
        CREATE TABLE return_transactions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          original_sale_id INT NOT NULL,
          return_type ENUM('return', 'exchange') NOT NULL,
          total_refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          total_exchange_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          reason VARCHAR(255),
          customer_notes TEXT,
          status ENUM('pending', 'approved', 'completed', 'cancelled') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (original_sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          INDEX idx_return_original_sale (original_sale_id),
          INDEX idx_return_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
    }

    // Get available columns for dynamic insert
    const [rtColsRows]: any = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_transactions'`,
      [dbName]
    );
    const rtCols: string[] = Array.isArray(rtColsRows) ? rtColsRows.map((r: any) => r.COLUMN_NAME) : [];

    // Check if return_items table exists, create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        return_transaction_id INT NOT NULL,
        original_sale_item_id INT,
        product_id INT NOT NULL,
        action_type ENUM('return', 'exchange_out', 'exchange_in') NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255),
        condition_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (original_sale_item_id) REFERENCES sale_items(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_return_items_transaction (return_transaction_id),
        INDEX idx_return_items_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    try {
      // Start transaction
      await pool.query('START TRANSACTION');

      // Generate return number (optional)
      const returnDate = new Date();
      const year = returnDate.getFullYear();
      const month = String(returnDate.getMonth() + 1).padStart(2, '0');
      const day = String(returnDate.getDate()).padStart(2, '0');
      const timestamp = Date.now().toString().slice(-6);
      const returnNumber = `RET-${year}${month}${day}-${timestamp}`;

      // Dynamic insert based on available columns
      const insertCols: string[] = [];
      const insertVals: any[] = [];

      if (rtCols.includes('original_sale_id')) { insertCols.push('original_sale_id'); insertVals.push(original_sale_id); }
      if (rtCols.includes('return_number')) { insertCols.push('return_number'); insertVals.push(returnNumber); }
      if (rtCols.includes('return_type')) { insertCols.push('return_type'); insertVals.push(return_type); }
      if (rtCols.includes('total_refund_amount')) { insertCols.push('total_refund_amount'); insertVals.push(return_type === 'return' ? total_refund_amount : 0); }
      if (rtCols.includes('total_exchange_amount')) { insertCols.push('total_exchange_amount'); insertVals.push(return_type === 'exchange' ? total_refund_amount : 0); }
      if (rtCols.includes('reason')) { insertCols.push('reason'); insertVals.push(reason || null); }
      if (rtCols.includes('customer_notes')) { insertCols.push('customer_notes'); insertVals.push(customer_notes || null); }
      if (rtCols.includes('status')) { insertCols.push('status'); insertVals.push('pending'); }

      const placeholders = insertCols.map(() => '?').join(', ');
      const [returnResult] = await pool.query(
        `INSERT INTO return_transactions (${insertCols.join(', ')}) VALUES (${placeholders})`,
        insertVals
      );

      const returnTransactionId = (returnResult as any).insertId;
      console.log('✅ Return transaction created:', returnTransactionId);

      // Prepare return_items insert dynamically based on available columns
      const [riColsRows]: any = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_items'`,
        [dbName]
      );
      const riCols: string[] = Array.isArray(riColsRows) ? riColsRows.map((r: any) => r.COLUMN_NAME) : [];

      for (const item of items) {
        const cols: string[] = []
        const vals: any[] = []
        if (riCols.includes('return_transaction_id')) { cols.push('return_transaction_id'); vals.push(returnTransactionId) }
        if (riCols.includes('original_sale_item_id')) { cols.push('original_sale_item_id'); vals.push(item.original_sale_item_id || null) }
        if (riCols.includes('product_id')) { cols.push('product_id'); vals.push(item.product_id) }
        if (riCols.includes('action_type')) { cols.push('action_type'); vals.push(return_type === 'return' ? 'return' : 'exchange_out') }
        if (riCols.includes('quantity')) { cols.push('quantity'); vals.push(item.quantity) }
        if (riCols.includes('unit_price')) { cols.push('unit_price'); vals.push(item.unit_price) }
        if (riCols.includes('total_amount')) { cols.push('total_amount'); vals.push(item.total_amount || (item.quantity * item.unit_price)) }
        if (riCols.includes('reason')) { cols.push('reason'); vals.push(item.reason || null) }
        if (riCols.includes('condition_notes')) { cols.push('condition_notes'); vals.push(item.condition_notes || null) }

        const placeholders = cols.map(() => '?').join(', ')
        await pool.query(
          `INSERT INTO return_items (${cols.join(', ')}) VALUES (${placeholders})`,
          vals
        )
        console.log(`✅ Return item added: Product ${item.product_id}, Qty: ${item.quantity}`)
      }

      // Create a new sale for the return ticket
      const [newSaleResult] = await pool.query(`
        INSERT INTO sales (
          user_id,
          stock_id,
          client_id,
          total,
          payment_method,
          payment_status,
          notes,
          source,
          created_at
        )
        SELECT
          s.user_id,
          s.stock_id,
          s.client_id,
          -?,
          s.payment_method,
          'paid',
          CONCAT('RETOUR - Facture originale: ', COALESCE(s.invoice_number, CONCAT('SALE-', s.id))),
          'pos',
          NOW()
        FROM sales s
        WHERE s.id = ?
      `, [total_refund_amount, original_sale_id]);

      const returnSaleId = newSaleResult.insertId;

      // Generate return invoice number
      const returnInvoiceNumber = `RET-${String(returnSaleId).padStart(6, '0')}-${year}`;

      // Update the return sale with invoice number
      await pool.query(
        'UPDATE sales SET invoice_number = ? WHERE id = ?',
        [returnInvoiceNumber, returnSaleId]
      );

      // Create sale items for the return (negative quantities)
      for (const item of items) {
        await pool.query(`
          INSERT INTO sale_items (
            sale_id,
            product_id,
            quantity,
            unit_price
          ) VALUES (?, ?, ?, ?)
        `, [
          returnSaleId,
          item.product_id,
          -item.quantity, // Negative quantity for return
          item.unit_price
        ]);
      }

      // Commit transaction
      await pool.query('COMMIT');

      console.log('✅ Return transaction completed successfully');

      return NextResponse.json({
        success: true,
        data: {
          id: returnTransactionId,
          return_number: returnNumber,
          return_sale_id: returnSaleId,
          return_invoice_number: returnInvoiceNumber,
          return_type,
          total_refund_amount,
          items_count: items.length
        },
        message: `${return_type === 'return' ? 'Retour' : 'Échange'} créé avec succès`
      });

    } catch (dbError) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      console.error('❌ Database error creating return:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database error creating return', details: dbError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error creating return:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Returns API called');

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';

    console.log('🔄 Request params:', { stockId, page, limit, search });

    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    let dbStockId = null;
    if (stockId) {
      dbStockId = stockMapping[stockId as keyof typeof stockMapping];
      console.log('🔄 Mapped stockId:', stockId, '→', dbStockId);
    }

    const offset = (page - 1) * limit;

    try {
      // Introspect DB to adapt to available schema
      const [dbRows]: any = await pool.query(`SELECT DATABASE() AS db`);
      const dbName = Array.isArray(dbRows) && dbRows[0]?.db ? dbRows[0].db : 'stock';

      // Check if return_transactions table exists
      const [rtRows]: any = await pool.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_transactions'`,
        [dbName]
      );
      const returnTableExists = Array.isArray(rtRows) && (rtRows[0]?.cnt || 0) > 0;

      if (!returnTableExists) {
        console.log('❌ Return transactions table does not exist');
        return NextResponse.json({
          success: true,
          data: {
            returns: [],
            pagination: { page: 1, limit, total: 0, totalPages: 0 }
          }
        });
      }

      // Detect client table name
      const [clientsTableRows]: any = await pool.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('clients','customers')`,
        [dbName]
      );
      const tableNames = Array.isArray(clientsTableRows) ? clientsTableRows.map((r: any) => r.TABLE_NAME) : [];
      const hasClients = tableNames.includes('clients');
      const hasCustomers = tableNames.includes('customers');
      const clientJoin = hasClients
        ? 'LEFT JOIN clients c ON rt.client_id = c.id'
        : hasCustomers
          ? 'LEFT JOIN customers c ON rt.client_id = c.id'
          : '';
      const hasClientName = !!clientJoin;

      // Build where clause
      let whereClause = '';
      let queryParams = [];

      if (dbStockId) {
        whereClause = 'WHERE s.stock_id = ?';
        queryParams.push(dbStockId);
      }

      // Add search condition
      if (search && search.trim()) {
        const searchCondition = whereClause ? ' AND ' : 'WHERE ';
        const searchValue = `%${search}%`;
        const exactTotal = parseFloat(search) || 0;

        const parts: string[] = [];
        const partParams: any[] = [];

        parts.push('rt.notes LIKE ?'); partParams.push(searchValue);
        if (hasClientName) { parts.push('c.name LIKE ?'); partParams.push(searchValue); }
        parts.push('rt.payment_method LIKE ?'); partParams.push(searchValue);
        parts.push('rt.return_type LIKE ?'); partParams.push(searchValue);
        parts.push('rt.total_amount = ?'); partParams.push(exactTotal);

        whereClause += searchCondition + `(${parts.join(' OR ')})`;
        queryParams.push(...partParams);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT rt.id) as total
        FROM return_transactions rt
        LEFT JOIN sales s ON rt.original_sale_id = s.id
        ${clientJoin}
        ${whereClause}
      `;

      const [countRows] = await pool.query(countQuery, queryParams);
      const total = (Array.isArray(countRows) && countRows[0]?.total) ? countRows[0].total : 0;
      console.log('🔄 Total returns found:', total);

      // Get returns with proper JOINs
      const returnsQuery = `
        SELECT
          rt.id,
          rt.original_sale_id,
          rt.client_id,
          ${hasClientName ? `COALESCE(c.name, 'Client anonyme')` : `'Client anonyme'`} as client_name,
          rt.return_type,
          rt.total_amount,
          rt.total_refund_amount,
          rt.total_exchange_amount,
          rt.payment_method,
          rt.status,
          rt.notes,
          rt.created_at,
          rt.processed_at,
          s.total as original_sale_total,
          u.username as user_name
        FROM return_transactions rt
        LEFT JOIN sales s ON rt.original_sale_id = s.id
        ${clientJoin}
        LEFT JOIN users u ON rt.user_id = u.id
        ${whereClause}
        ORDER BY rt.created_at DESC
        LIMIT ? OFFSET ?
      `;

      console.log('🔄 Returns query:', returnsQuery);
      const [returnsResult] = await pool.query(returnsQuery, [...queryParams, limit, offset]);

      const returns = Array.isArray(returnsResult) ? returnsResult : [];

      console.log(`✅ Found ${returns.length} returns for stock ${stockId || 'all'}`);

      return NextResponse.json({
        success: true,
        data: {
          returns: returns,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: dbError.message,
        data: {
          returns: [],
          pagination: { page: 1, limit: 25, total: 0, totalPages: 0 }
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ General error in returns API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      data: {
        returns: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 }
      }
    }, { status: 500 });
  }
}

// NOTE: This simplified POST handler duplicates the main POST above and causes build conflicts.
// It has been commented out to fix the Next build. If needed, move it to app/api/returns/simple/route.ts.
/*
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating new return');

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    let dbStockId = stockId ? stockMapping[stockId as keyof typeof stockMapping] : null;
    const body = await request.json();

    console.log('🔄 Received return data:', body);
    console.log('🔄 Stock mapping:', { stockId, dbStockId });

    const {
      product_id,
      customer_id,
      quantity,
      reason,
      refund_amount
    } = body;

    // Validation
    if (!product_id || !quantity || quantity <= 0) {
      console.log('❌ Missing or invalid required fields');
      return NextResponse.json(
        { success: false, error: 'Product ID and quantity are required' },
        { status: 400 }
      );
    }

    if (!dbStockId) {
      console.log('❌ Invalid stock ID:', stockId);
      return NextResponse.json(
        { success: false, error: 'Valid stock ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get product information
      const [productRows] = await pool.query(
        'SELECT * FROM products WHERE id = ? AND stock_id = ?',
        [product_id, dbStockId]
      );

      if (!Array.isArray(productRows) || productRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }

      const product = productRows[0];
      const unitPrice = product.price || 0;
      const totalAmount = refund_amount || (unitPrice * quantity);

      // Create return transaction
      const [result] = await pool.query(
        `INSERT INTO return_transactions (
          original_sale_id,
          stock_id,
          client_id,
          total_amount,
          total_refund_amount,
          total_exchange_amount,
          return_type,
          payment_method,
          status,
          notes,
          user_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          null, // No original sale for simple returns
          dbStockId,
          customer_id || null,
          totalAmount,
          totalAmount,
          0,
          'refund',
          'cash',
          'pending',
          reason || 'Return',
          1 // Default user ID
        ]
      );

      const returnId = result.insertId;
      console.log('✅ Return transaction created with ID:', returnId);

      // Insert return item
      await pool.query(
        'INSERT INTO return_items (return_transaction_id, product_id, quantity, unit_price, action_type) VALUES (?, ?, ?, ?, ?)',
        [returnId, product_id, quantity, unitPrice, 'return']
      );

      // Update product stock (add back the returned quantity)
      await pool.query(
        'UPDATE products SET quantity = quantity + ? WHERE id = ? AND stock_id = ?',
        [quantity, product_id, dbStockId]
      );

      console.log(`✅ Stock updated for product ${product_id}: +${quantity}`);

      return NextResponse.json({
        success: true,
        data: {
          id: returnId,
          product_id,
          customer_id,
          quantity,
          reason,
          refund_amount: totalAmount,
          total_amount: totalAmount
        },
        message: 'Return created successfully'
      });

    } catch (dbError) {
      console.error('❌ Database error creating return:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database error creating return', details: dbError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error creating return:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
*/
