import { NextRequest, NextResponse } from 'next/server';
import pool, { getMany } from '@/lib/database';
import { ApiResponse, STOCK_MAPPING, STOCK_NAMES } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId'); // current dashboard stock (e.g., depot "gros")
    const toStockId = searchParams.get('toStockId'); // explicit destination filter (e.g., library)
    const type = searchParams.get('type'); // 'received' for received movements
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('📦 Stock Movements API - GET request:', { stockId, toStockId, type, page, limit });

    // Map slugs/ids to numeric
    const mapToId = (val: string | null): number | undefined => {
      if (!val) return undefined;
      if (!isNaN(parseInt(val))) return parseInt(val);
      return STOCK_MAPPING[val as keyof typeof STOCK_MAPPING];
    };

    const stockDbId = mapToId(stockId || null); // usually depot when browsing its dashboard
    const toStockDbId = mapToId(toStockId || null); // explicit destination filter

    // Get stock movements (if table exists)
    let stockMovements = [] as any[];
    try {
      if (type === 'received' && toStockDbId) {
        // Received movements: only movements TO this stock
        stockMovements = await getMany('stock_movements', { to_stock_id: toStockDbId }, '*', 'created_at DESC', limit);
        console.log(`📥 Fetching received movements for stock ${toStockId} (ID: ${toStockDbId})`);
      } else if (toStockDbId) {
        // When toStockId is provided, filter by destination (library view)
        stockMovements = await getMany('stock_movements', { to_stock_id: toStockDbId }, '*', 'created_at DESC', limit);
      } else if (stockDbId) {
        // Show both outgoing and incoming related to this stock (defensive)
        const outgoing = await getMany('stock_movements', { from_stock_id: stockDbId }, '*', 'created_at DESC', limit);
        const incoming = await getMany('stock_movements', { to_stock_id: stockDbId }, '*', 'created_at DESC', limit);
        const byId: Record<number, any> = {};
        [...outgoing, ...incoming].forEach((m: any) => { byId[m.id] = m; });
        stockMovements = Object.values(byId)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
      } else {
        // No filter: return recent movements
        stockMovements = await getMany('stock_movements', {}, '*', 'created_at DESC', limit);
      }
    } catch (error) {
      console.log('⚠️ Stock movements table might not exist, returning empty array');
      stockMovements = [];
    }

    // Enrich with names (for display) without requiring JOIN
    const enriched = stockMovements.map((m: any) => ({
      ...m,
      from_stock_name: STOCK_NAMES[m.from_stock_id as keyof typeof STOCK_NAMES] || String(m.from_stock_id),
      to_stock_name: STOCK_NAMES[m.to_stock_id as keyof typeof STOCK_NAMES] || String(m.to_stock_id),
    }));

    console.log('📊 Stock movements result:', { count: enriched.length });

    const response: ApiResponse<any[]> = {
      success: true,
      data: enriched,
      message: 'Stock movements retrieved successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Stock movements API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from_stock_id, to_stock_id, user_id, recipient_name, notes, items } = body as any;

    // Validate basics
    if (!from_stock_id || !to_stock_id || !recipient_name || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'from_stock_id, to_stock_id, recipient_name and items[] are required' },
        { status: 400 }
      );
    }

    // Accept both slug and numeric for to_stock_id
    let toStockIdNum: number | null = null;
    if (typeof to_stock_id === 'string') {
      toStockIdNum = STOCK_MAPPING[to_stock_id as keyof typeof STOCK_MAPPING] || (isNaN(parseInt(to_stock_id)) ? null : parseInt(to_stock_id));
    } else if (typeof to_stock_id === 'number') {
      toStockIdNum = to_stock_id;
    }

    if (!toStockIdNum) {
      return NextResponse.json(
        { success: false, error: 'Invalid destination stock (to_stock_id)' },
        { status: 400 }
      );
    }

    // Validate items
    for (const it of items) {
      if (!it.product_id || !it.quantity || it.quantity <= 0 || !it.unit_price || it.unit_price <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item requires product_id, quantity > 0 and unit_price > 0' },
          { status: 400 }
        );
      }
    }

    // Generate unique movement number
    const movementNumber = `MOV-${Date.now()}`;

    // Compute total amount
    const totalAmount = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) * Number(it.unit_price)), 0);

    // Transaction: insert movement header + items
    // Transaction: insert movement header + items
    const txConn = await pool.getConnection();
    try {
      await txConn.beginTransaction();

      const [headerResult]: any = await txConn.execute(
        `INSERT INTO stock_movements (from_stock_id, to_stock_id, user_id, movement_number, recipient_name, total_amount, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
        [from_stock_id, toStockIdNum, user_id || null, movementNumber, recipient_name, totalAmount, notes || null]
      );
      const movementId = headerResult.insertId;

      for (const it of items) {
        await txConn.execute(
          `INSERT INTO stock_movement_items (movement_id, product_id, quantity, unit_price, total_price, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [movementId, it.product_id, it.quantity, it.unit_price, (Number(it.quantity) * Number(it.unit_price)), it.notes || null]
        );
      }

      await txConn.commit();

      return NextResponse.json({
        success: true,
        data: { id: movementId, movement_number: movementNumber },
        message: 'Stock movement created successfully'
      });
    } catch (txErr) {
      await txConn.rollback();
      console.error('❌ Tx error creating stock movement:', txErr);
      return NextResponse.json({ success: false, error: 'Failed to create movement' }, { status: 500 });
    } finally {
      txConn.release();
    }
  } catch (error) {
    console.error('❌ Stock movement creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
