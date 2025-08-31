import { NextRequest, NextResponse } from 'next/server';
import { getOne, updateRecord, getMany } from '@/lib/database';
import { ApiResponse, ReturnTransactionWithItems } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const returnId = parseInt(params.id);

    if (isNaN(returnId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid return ID' },
        { status: 400 }
      );
    }

    // Get return transaction details
    const returnResult = await getOne(
      `SELECT rt.*, 
              s.total as original_sale_total,
              c.name as client_name, c.email as client_email,
              u.username as user_name
       FROM return_transactions rt
       LEFT JOIN sales s ON rt.original_sale_id = s.id
       LEFT JOIN clients c ON rt.client_id = c.id
       LEFT JOIN users u ON rt.user_id = u.id
       WHERE rt.id = ?`,
      [returnId]
    );

    if (!returnResult.success || !returnResult.data) {
      return NextResponse.json(
        { success: false, error: 'Return transaction not found' },
        { status: 404 }
      );
    }

    // Get return items
    const itemsResult = await getMany(
      `SELECT ri.*, p.name as product_name, p.reference as product_reference
       FROM return_items ri
       INNER JOIN products p ON ri.product_id = p.id
       WHERE ri.return_transaction_id = ?
       ORDER BY ri.action_type, ri.created_at`,
      [returnId]
    );

    if (!itemsResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch return items' },
        { status: 500 }
      );
    }

    const returnTransaction: ReturnTransactionWithItems = {
      ...returnResult.data,
      items: itemsResult.data as any[],
    };

    const response: ApiResponse<ReturnTransactionWithItems> = {
      success: true,
      data: returnTransaction,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Return fetch error:', error);
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
    const returnId = parseInt(params.id);
    const body = await request.json();
    const { status, notes } = body;

    if (isNaN(returnId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid return ID' },
        { status: 400 }
      );
    }

    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update return transaction
    const updateFields = ['status = ?'];
    const updateValues = [status];

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (status === 'completed') {
      updateFields.push('processed_at = NOW()');
    }

    updateValues.push(returnId);

    const result = await updateRecord(
      `UPDATE return_transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update return transaction' },
        { status: 500 }
      );
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Return transaction updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Return update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const returnId = parseInt(params.id);

    if (isNaN(returnId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid return ID' },
        { status: 400 }
      );
    }

    // Check if return is still pending (only pending returns can be deleted)
    const returnResult = await getOne(
      'SELECT status FROM return_transactions WHERE id = ?',
      [returnId]
    );

    if (!returnResult.success || !returnResult.data) {
      return NextResponse.json(
        { success: false, error: 'Return transaction not found' },
        { status: 404 }
      );
    }

    if (returnResult.data.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending returns can be deleted' },
        { status: 400 }
      );
    }

    // Get return items to reverse stock changes
    const itemsResult = await getMany(
      'SELECT * FROM return_items WHERE return_transaction_id = ?',
      [returnId]
    );

    if (itemsResult.success && itemsResult.data) {
      // Reverse stock changes
      for (const item of itemsResult.data) {
        if (item.action_type === 'return') {
          // Remove the quantity that was added back
          await updateRecord(
            'UPDATE products SET quantity = quantity - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        } else if (item.action_type === 'exchange_in') {
          // Add back the quantity that was removed
          await updateRecord(
            'UPDATE products SET quantity = quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    // Delete return transaction (cascade will delete items)
    const deleteResult = await updateRecord(
      'DELETE FROM return_transactions WHERE id = ?',
      [returnId]
    );

    if (!deleteResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete return transaction' },
        { status: 500 }
      );
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Return transaction deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Return deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
