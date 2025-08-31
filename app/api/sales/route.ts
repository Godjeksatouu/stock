import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

// GET: fetch sales with filters
export async function GET(request: NextRequest) {
  try {
    console.log('💰  Sales API called');

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const source = searchParams.get('source'); // Add source filter
    const search = searchParams.get('search');
    const barcode = searchParams.get('barcode');

    const stockMapping: Record<string, number> = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    let dbStockId = stockId ? stockMapping[stockId] : null;

    console.log('💰  Request params:', { stockId, dbStockId, page, limit, source, search, barcode });

    // Build WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    // Stock filter
    if (dbStockId) {
      whereConditions.push('stock_id = ?');
      queryParams.push(dbStockId);
    }

    // Source filter
    if (source) {
      whereConditions.push('source = ?');
      queryParams.push(source);
    }

    // Search filter
    if (search) {
      whereConditions.push('(invoice_number LIKE ? OR notes LIKE ? OR id = ?)');
      queryParams.push(`%${search}%`, `%${search}%`, search);
    }

    // Barcode filter
    if (barcode) {
      whereConditions.push('barcode LIKE ?');
      queryParams.push(`%${barcode}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM sales ${whereClause}`;
    const [countResult] = await pool.query(countQuery, queryParams);
    const total = (countResult as any)[0].total;

    // Get sales data
    const salesQuery = `
      SELECT
        id,
        invoice_number,
        user_id,
        stock_id,
        client_id,
        total,
        amount_paid,
        change_amount,
        barcode,
        created_at,
        payment_method,
        payment_status,
        notes,
        global_discount_type,
        global_discount_value,
        global_discount_amount,
        source
      FROM sales
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?, ?
    `;

    queryParams.push((page - 1) * limit, limit);
    const [rows] = await pool.query(salesQuery, queryParams);

    // Transform data to match expected format
    const sales = (rows as any[]).map(sale => ({
      id: sale.id,
      sale_number: `SALE-${String(sale.id).padStart(6, '0')}`,
      invoice_number: sale.invoice_number,
      customer_id: sale.client_id,
      customer_name: sale.client_id ? `Client #${sale.client_id}` : 'Client anonyme',
      total_amount: sale.total,
      amount_paid: sale.amount_paid,
      change_amount: sale.change_amount,
      payment_method: sale.payment_method || 'cash',
      payment_status: sale.payment_status || 'paid',
      notes: sale.notes,
      created_at: sale.created_at,
      sale_barcode: sale.barcode,
      source: sale.source,
      global_discount_amount: sale.global_discount_amount
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        sales,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('💥  GET Sales error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message });
  }
}

// POST: create a new sale
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockIdParam = searchParams.get('stockId');

    const stockMapping: Record<string, number> = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    const body = await request.json();

    const {
      user_id,
      stock_id: bodyStockId,
      client_id = null,
      items = [],            // Array of sale items
      total,
      amount_paid = 0,
      change_amount = 0,
      payment_method = 'cash',
      payment_status = 'pending',
      notes = '',
      global_discount_type = 'percentage',
      global_discount_value = 0,
      global_discount_amount = 0,
      source = 'pos'
    } = body;

    // Use stock_id from body if provided, otherwise map from stockId parameter
    const finalStockId = bodyStockId || (stockIdParam ? stockMapping[stockIdParam] : null);

    console.log('📦 Sale creation data:', {
      user_id,
      bodyStockId,
      stockIdParam,
      finalStockId,
      items: items.length,
      total,
      amount_paid,
      change_amount,
      payment_method,
      payment_status
    });

    // ✅ Validate required fields
    if (!user_id || !finalStockId || !total) {
      console.log('❌ Validation failed:', { user_id, finalStockId, total });
      return NextResponse.json({
        success: false,
        error: 'user_id, stock_id and total are required',
        received: { user_id, stock_id: finalStockId, total }
      });
    }

    // Validate items if provided
    if (items.length > 0) {
      for (const item of items) {
        if (!item.product_id || !item.quantity || !item.unit_price) {
          console.log('❌ Invalid item:', item);
          return NextResponse.json({
            success: false,
            error: 'Each item must have product_id, quantity, and unit_price',
            received: item
          });
        }
      }
    }

    // ✅ Validate payment_status
    const allowedStatuses = ['pending', 'partial', 'paid'];
    const finalStatus = allowedStatuses.includes(payment_status) ? payment_status : 'pending';

    // ✅ Validate payment_method
    const allowedMethods = ['cash', 'card', 'check', 'credit'];
    const finalMethod = allowedMethods.includes(payment_method) ? payment_method : 'cash';

    // ✅ Validate global_discount_type
    const allowedDiscountTypes = ['percentage', 'amount'];
    const finalDiscountType = allowedDiscountTypes.includes(global_discount_type) ? global_discount_type : 'percentage';

    // ✅ Validate source
    const allowedSources = ['pos', 'manual'];
    const finalSource = allowedSources.includes(source) ? source : 'pos';

    // ✅ Insert sale into database (without product_id)
    const [result] = await pool.query(
      `INSERT INTO sales
        (user_id, stock_id, client_id, total, amount_paid, change_amount, payment_method, payment_status, notes, global_discount_type, global_discount_value, global_discount_amount, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user_id, finalStockId, client_id, total, amount_paid, change_amount,
        finalMethod, finalStatus, notes, finalDiscountType, global_discount_value, global_discount_amount,
        finalSource
      ]
    );

    const saleId = (result as any).insertId;
    console.log('✅ Sale created with ID:', saleId);

    // ✅ Insert sale items if provided
    if (items.length > 0) {
      for (const item of items) {
        const totalPrice = item.quantity * item.unit_price;
        await pool.query(
          `INSERT INTO sale_items
            (sale_id, product_id, quantity, unit_price, total_price, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [saleId, item.product_id, item.quantity, item.unit_price, totalPrice]
        );
        console.log('✅ Sale item added:', { product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price });
      }
    }

    console.log('✅ Sale created successfully:', { saleId, user_id, finalStockId, total, itemsCount: items.length });

    return NextResponse.json({
      success: true,
      data: {
        id: saleId,
        sale_id: saleId,
        user_id,
        stock_id: finalStockId,
        total,
        amount_paid,
        change_amount,
        payment_method: finalMethod,
        payment_status: finalStatus,
        items_count: items.length
      }
    });
  } catch (error) {
    console.error('❌  Database error creating sale:', error);
    return NextResponse.json({ success: false, error: (error as any).sqlMessage || (error as Error).message });
  }
}

