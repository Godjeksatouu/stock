import { NextRequest, NextResponse } from 'next/server';
import { getOne, updateRecord, getMany, execute, pool } from '@/lib/database';
import { ApiResponse, StockMovementWithItems } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movementId = parseInt(params.id);

    if (isNaN(movementId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movement ID' },
        { status: 400 }
      );
    }

    // Get movement details with joins using raw query
    const [movementRows] = await pool.execute(
      `SELECT sm.*,
              fs.name as from_stock_name,
              ts.name as to_stock_name,
              u.username as user_name
       FROM stock_movements sm
       LEFT JOIN stocks fs ON sm.from_stock_id = fs.id
       LEFT JOIN stocks ts ON sm.to_stock_id = ts.id
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.id = ?`,
      [movementId]
    );

    if (!Array.isArray(movementRows) || movementRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock movement not found' },
        { status: 404 }
      );
    }

    // Get movement items with product details using raw query
    const [itemRows] = await pool.execute(
      `SELECT smi.*, p.name as product_name, p.reference as product_reference
       FROM stock_movement_items smi
       INNER JOIN products p ON smi.product_id = p.id
       WHERE smi.movement_id = ?`,
      [movementId]
    );

    const movement: StockMovementWithItems = {
      ...movementRows[0],
      items: Array.isArray(itemRows) ? itemRows : [],
    };

    const response: ApiResponse<StockMovementWithItems> = {
      success: true,
      data: movement,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Movement fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movementId = parseInt(params.id);
    const body = await request.json();
    const { action, claim_message, requesting_stock_id } = body;

    // Get current user from session/auth (simplified for now)
    const authHeader = request.headers.get('authorization');
    let currentUserId = null;
    if (authHeader) {
      // In a real app, decode JWT or validate session
      // For now, we'll extract user ID from a simple format
      try {
        const userInfo = JSON.parse(authHeader);
        currentUserId = userInfo.userId;
      } catch (e) {
        // Fallback: no user tracking
      }
    }

    if (isNaN(movementId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movement ID' },
        { status: 400 }
      );
    }

    if (!action || !['confirm', 'claim'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "confirm" or "claim"' },
        { status: 400 }
      );
    }

    // Get movement details first
    const movement = await getOne(
      'stock_movements',
      { id: movementId }
    );

    if (!movement) {
      return NextResponse.json(
        { success: false, error: 'Stock movement not found' },
        { status: 404 }
      );
    }

    if (movement.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Movement is not in pending status' },
        { status: 400 }
      );
    }

    // Security validation: Only the receiving stock can confirm/claim movements
    if (!requesting_stock_id) {
      return NextResponse.json(
        { success: false, error: 'Requesting stock ID is required for security validation' },
        { status: 400 }
      );
    }

    const { STOCK_MAPPING } = await import('@/lib/types');
    const requestingStockDbId = STOCK_MAPPING[requesting_stock_id as keyof typeof STOCK_MAPPING];

    if (!requestingStockDbId) {
      return NextResponse.json(
        { success: false, error: 'Invalid requesting stock ID' },
        { status: 400 }
      );
    }

    if (requestingStockDbId !== movement.to_stock_id) {
      console.log(`🚫 Security violation: Stock ${requesting_stock_id} (ID: ${requestingStockDbId}) tried to act on movement for stock ID ${movement.to_stock_id}`);
      return NextResponse.json(
        { success: false, error: 'Only the receiving stock can perform this action' },
        { status: 403 }
      );
    }

    console.log(`✅ Security check passed: Stock ${requesting_stock_id} (ID: ${requestingStockDbId}) can act on movement ${movementId}`);

    let updateQuery = '';
    let updateParams: any[] = [];

    if (action === 'confirm') {
      // Confirm the movement - add products to target library stock
      updateQuery = 'UPDATE stock_movements SET status = ?, confirmed_date = NOW() WHERE id = ?';
      updateParams = ['confirmed', movementId];

      // Get movement items to add to target stock
      const itemsResult = await getMany(
        'stock_movement_items',
        { movement_id: movementId }
      );

      if (itemsResult && itemsResult.length > 0) {
        for (const item of itemsResult) {
          // Check if product exists in target stock
          const productResult = await getOne(
            'products',
            { id: item.product_id, stock_id: movement.to_stock_id }
          );

          if (productResult) {
            // Product exists, update quantity
            await execute(
              'UPDATE products SET quantity = quantity + ? WHERE id = ? AND stock_id = ?',
              [item.quantity, item.product_id, movement.to_stock_id]
            );
          } else {
            // Product doesn't exist in target stock, get product details and create it
            const sourceProduct = await getOne(
              'products',
              { id: item.product_id },
              'name, reference, description, price'
            );

            if (sourceProduct) {
              await execute(
                `INSERT INTO products (name, reference, description, price, quantity, stock_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [sourceProduct.name, sourceProduct.reference, sourceProduct.description,
                 sourceProduct.price, item.quantity, movement.to_stock_id]
              );
            }
          }
        }
      }
    } else if (action === 'claim') {
      // Create a claim
      if (!claim_message) {
        return NextResponse.json(
          { success: false, error: 'Claim message is required' },
          { status: 400 }
        );
      }

      updateQuery = 'UPDATE stock_movements SET status = ?, claim_message = ?, claim_date = NOW() WHERE id = ?';
      updateParams = ['claimed', claim_message, movementId];
    }

    const result = await execute(updateQuery, updateParams);

    if (!result || result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to update movement status' },
        { status: 500 }
      );
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: `Movement ${action}ed successfully`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Movement update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
