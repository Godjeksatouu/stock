import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  console.log('🔄 API Route hit: /api/returns/create-from-sale');

  try {
    const body = await request.json();
    console.log('📝 Received body:', JSON.stringify(body, null, 2));

    const {
      original_sale_id,
      stock_id,
      return_type,
      total_refund_amount,
      total_exchange_amount,
      notes,
      payment_method,
      return_items,
      exchange_items,
      user_id,
      client_id
    } = body;

    console.log('📝 Extracted values:', { original_sale_id, stock_id, return_type });

    // Validation
    if (!original_sale_id || !stock_id || !return_type) {
      console.log('❌ Validation failed: missing required fields');
      return NextResponse.json(
        { success: false, error: 'Données manquantes: original_sale_id, stock_id et return_type sont requis' },
        { status: 400 }
      );
    }

    // Map stock_id to database ID
    const stockMapping: Record<string, number> = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    const dbStockId = stockMapping[stock_id] || parseInt(stock_id);
    console.log('📍 Mapped stockId:', stock_id, '→', dbStockId);
    if (!dbStockId) {
      console.log('❌ Invalid stock ID:', stock_id);
      return NextResponse.json(
        { success: false, error: 'Stock ID invalide' },
        { status: 400 }
      );
    }

    // Check if sale exists
    console.log('🔍 Checking if sale exists...');
    const [saleRows] = await pool.query(
      'SELECT * FROM sales WHERE id = ? AND stock_id = ?',
      [original_sale_id, dbStockId]
    );

    if (!Array.isArray(saleRows) || saleRows.length === 0) {
      console.log('❌ Sale not found:', original_sale_id, 'for stock:', dbStockId);
      return NextResponse.json(
        { success: false, error: 'Vente non trouvée' },
        { status: 404 }
      );
    }

    const sale = saleRows[0];
    console.log('✅ Sale found:', sale.id, 'Client ID:', sale.client_id);

    // Compute totals from return_items
    let computedRefund = 0;
    let computedExchange = 0;

    if (Array.isArray(return_items)) {
      console.log('📦 Processing return items:', return_items.length);
      for (const item of return_items) {
        const pid = Number(item.product_id);
        const qty = Number(item.quantity || item.quantity_returned || 0);
        const unit = Number(item.unit_price || 0);
        if (pid && qty > 0 && unit > 0) {
          computedRefund += unit * qty;
          console.log(`  - Product ${pid}: ${qty} x ${unit} = ${unit * qty}`);
        }
      }
    }

    if (Array.isArray(exchange_items)) {
      console.log('🔄 Processing exchange items:', exchange_items.length);
      for (const item of exchange_items) {
        const pid = Number(item.product_id);
        const qty = Number(item.quantity || 0);
        const unit = Number(item.unit_price || 0);
        if (pid && qty > 0 && unit > 0) {
          computedExchange += unit * qty;
          console.log(`  - Exchange Product ${pid}: ${qty} x ${unit} = ${unit * qty}`);
        }
      }
    }

    const refundTotal = typeof total_refund_amount === 'number' ? total_refund_amount : computedRefund;
    const exchangeTotal = typeof total_exchange_amount === 'number' ? total_exchange_amount : computedExchange;
    const totalAmount = refundTotal + exchangeTotal;

    console.log('💰 Computed totals:', { refundTotal, exchangeTotal, totalAmount });

    // Get client_id from sale or use null (column is nullable now)
    const finalClientId = client_id || sale.client_id || null;
    console.log('👤 Using client_id:', finalClientId);

    // Create return transaction
    console.log('📝 Creating return transaction...');
    const [result] = await pool.query(
      `INSERT INTO return_transactions (
        original_sale_id,
        stock_id,
        client_id,
        user_id,
        return_type,
        total_amount,
        total_refund_amount,
        total_exchange_amount,
        payment_method,
        status,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        original_sale_id,
        dbStockId,
        finalClientId,
        user_id || 1,
        return_type,
        totalAmount,
        refundTotal || 0,
        exchangeTotal || 0,
        payment_method || 'cash',
        'pending',
        notes || ''
      ]
    );

    const returnId = (result as any).insertId;
    console.log('✅ Return transaction created with ID:', returnId);

    // Insert return and exchange items + update stock
    if (Array.isArray(return_items) && return_items.length > 0) {
      console.log('📦 Processing return items:', return_items.length);
      for (const item of return_items) {
        const pid = Number(item.product_id);
        const qty = Number(item.quantity || item.quantity_returned || 0);
        const unit = Number(item.unit_price || 0);

        if (pid && qty > 0 && unit > 0) {
          try {
            console.log(`📝 Inserting return item: Product ${pid}, Qty ${qty}, Unit ${unit}`);
            await pool.query(
              'INSERT INTO return_items (return_transaction_id, product_id, quantity, unit_price, action_type) VALUES (?, ?, ?, ?, ?)',
              [returnId, pid, qty, unit, 'return']
            );
            console.log(`✅ Return item added: Product ${pid}, Qty ${qty}`);

            // Increase stock for returned items
            console.log(`📈 Updating stock for product ${pid}: +${qty}`);
            await pool.query(
              'UPDATE products SET quantity = quantity + ? WHERE id = ? AND stock_id = ?',
              [qty, pid, dbStockId]
            );
            console.log(`✅ Stock increased for product ${pid}: +${qty}`);
          } catch (itemError) {
            console.error(`❌ Error processing return item ${pid}:`, itemError.message);
            throw itemError; // Re-throw to trigger rollback
          }
        }
      }
    }

    if (Array.isArray(exchange_items) && exchange_items.length > 0) {
      console.log('🔄 Processing exchange items:', exchange_items.length);
      for (const item of exchange_items) {
        const pid = Number(item.product_id);
        const qty = Number(item.quantity || 0);
        const unit = Number(item.unit_price || 0);

        if (pid && qty > 0 && unit > 0) {
          try {
            console.log(`📝 Inserting exchange item: Product ${pid}, Qty ${qty}, Unit ${unit}`);
            await pool.query(
              'INSERT INTO return_items (return_transaction_id, product_id, quantity, unit_price, action_type) VALUES (?, ?, ?, ?, ?)',
              [returnId, pid, qty, unit, 'exchange_in']
            );
            console.log(`✅ Exchange item added: Product ${pid}, Qty ${qty}`);

            // Decrease stock for exchanged (new) items
            console.log(`📉 Updating stock for product ${pid}: -${qty}`);
            await pool.query(
              'UPDATE products SET quantity = quantity - ? WHERE id = ? AND stock_id = ?',
              [qty, pid, dbStockId]
            );
            console.log(`✅ Stock decreased for product ${pid}: -${qty}`);
          } catch (itemError) {
            console.error(`❌ Error processing exchange item ${pid}:`, itemError.message);
            throw itemError; // Re-throw to trigger rollback
          }
        }
      }
    }

    const balance_adjustment = (exchangeTotal || 0) - (refundTotal || 0);
    console.log('💰 Final totals:', { refundTotal, exchangeTotal, balance_adjustment });

    return NextResponse.json({
      success: true,
      data: {
        id: returnId,
        return_type: return_type,
        original_sale_id,
        total_refund_amount: refundTotal || 0,
        total_exchange_amount: exchangeTotal || 0,
        balance_adjustment,
        payment_method: payment_method || 'cash',
        notes: notes || null,
        return_items: Array.isArray(return_items) ? return_items.filter(it => it.quantity > 0) : [],
        exchange_items: Array.isArray(exchange_items) ? exchange_items.filter(it => it.quantity > 0) : []
      },
      message: 'Retour créé avec succès'
    });

  } catch (error: any) {
    console.error('❌ Error creating return from sale:', error);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création du retour',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log('🔍 GET request to /api/returns/create-from-sale');
  return NextResponse.json({
    success: true,
    message: 'Returns API is working',
    timestamp: new Date().toISOString()
  });
}
