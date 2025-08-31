import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('💰 Get single sale:', id);

    // Get sale details with proper column names
    const [saleResult] = await pool.query(`
      SELECT
        s.id,
        CONCAT('SALE-', s.id) as sale_number,
        s.invoice_number,
        s.barcode as sale_barcode,
        s.client_id as customer_id,
        s.total as total_amount,
        s.amount_paid,
        s.change_amount,
        s.payment_method,
        s.payment_status,
        s.total as subtotal,
        0 as tax_amount,
        0 as discount_amount,
        s.notes,
        s.stock_id,
        s.created_at,
        COALESCE(c.name, 'Client anonyme') as customer_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = ?
    `, [id]);

    if (!saleResult || saleResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    const sale = saleResult[0];

    // Get sale items with product details and barcodes
    const [itemsResult] = await pool.query(`
      SELECT
        si.id,
        si.product_id,
        si.quantity,
        si.unit_price,
        (si.quantity * si.unit_price) as total_price,
        p.name as product_name,
        p.reference as product_reference,
        GROUP_CONCAT(DISTINCT b.code) as product_barcodes
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN barcodes b ON p.id = b.product_id
      WHERE si.sale_id = ?
      GROUP BY si.id, si.product_id, si.quantity, si.unit_price, p.name, p.reference
      ORDER BY si.id
    `, [id]);

    const items = Array.isArray(itemsResult) ? itemsResult : [];

    // Get all barcodes for this sale (both sale barcode and product barcodes)
    const allBarcodes = [];
    if (sale.sale_barcode) {
      allBarcodes.push(sale.sale_barcode);
    }

    items.forEach(item => {
      if (item.product_barcodes) {
        const productBarcodes = item.product_barcodes.split(',');
        allBarcodes.push(...productBarcodes);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...sale,
        items: items,
        barcodes: allBarcodes.join(','),
        items_count: items.length,
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error getting sale:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    console.log('💰 Update sale:', id, body);

    const { customer_id, total_amount, payment_method, payment_status, subtotal, tax_amount, discount_amount, notes } = body;

    const [result] = await pool.query(`
      UPDATE sales 
      SET customer_id = ?, total_amount = ?, payment_method = ?, payment_status = ?,
          subtotal = ?, tax_amount = ?, discount_amount = ?, notes = ?
      WHERE id = ?
    `, [customer_id || null, parseFloat(total_amount), payment_method || 'cash', payment_status || 'paid',
        parseFloat(subtotal || total_amount), parseFloat(tax_amount || 0), 
        parseFloat(discount_amount || 0), notes || '', id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vente mise à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Error updating sale:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    console.log('💰 Delete sale:', id);

    const [result] = await pool.query('DELETE FROM sales WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vente supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Error deleting sale:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
