import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = parseInt(params.id);
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        i.*,
        c.name as customer_name,
        s.name as supplier_name
      FROM invoices i
      LEFT JOIN clients c ON i.customer_id = c.id
      LEFT JOIN fournisseurs s ON i.supplier_id = s.id
      WHERE i.id = ${invoiceId}
    `;

    const [rows] = await pool.query(query);
    const invoices = Array.isArray(rows) ? rows : [];

    if (invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoices[0]
    });
  } catch (error) {
    console.error('❌ Invoice GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = parseInt(params.id);
    const body = await request.json();

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const { status, due_date, subtotal, tax_amount, total_amount } = body;

    const escapedStatus = status ? pool.escape(status) : "'draft'";
    const escapedDueDate = due_date ? pool.escape(due_date) : 'NULL';

    const updateQuery = `
      UPDATE invoices 
      SET status = ${escapedStatus}, 
          due_date = ${escapedDueDate}, 
          subtotal = ${Number(subtotal)}, 
          tax_amount = ${Number(tax_amount || 0)},
          total_amount = ${Number(total_amount)}
      WHERE id = ${invoiceId}
    `;

    await pool.query(updateQuery);

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('❌ Invoice update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = parseInt(params.id);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const deleteQuery = `DELETE FROM invoices WHERE id = ${invoiceId}`;
    await pool.query(deleteQuery);

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('❌ Invoice deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
