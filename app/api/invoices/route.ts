import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

const STOCK_MAPPING: { [key: string]: number } = {
  'al-ouloum': 1,
  'renaissance': 2,
  'gros': 3
};

// --------------------- GET Invoices ---------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockIdParam = searchParams.get('stockId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('🔍 Invoices API GET:', { stockIdParam, page, limit });

    const stockDbId = stockIdParam && STOCK_MAPPING[stockIdParam] ? STOCK_MAPPING[stockIdParam] : 1;
    const offset = (page - 1) * limit;

    // Fetch invoices
    const query = `
      SELECT
        i.*,
        c.name AS customer_name,
        f.name AS supplier_name
      FROM invoices i
      LEFT JOIN clients c ON i.customer_id = c.id
      LEFT JOIN fournisseurs f ON i.supplier_id = f.id
      WHERE i.stock_id = ?
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [stockDbId, limit, offset]);
    const invoices = Array.isArray(rows) ? rows : [];

    // Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM invoices i
      WHERE i.stock_id = ?
    `;
    const [countRows] = await pool.query(countQuery, [stockDbId]);
    const totalItems = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Invoices GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// --------------------- POST Create Invoice ---------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creating invoice with data:', body);

    const {
      reference_id,
      invoice_type = 'sale',
      customer_id,
      supplier_id,
      subtotal = 0,
      tax_amount = 0,
      total_amount = 0,
      due_date,
      issue_date,
      stock_id = 1,
      status = 'draft',
      pdf_path,
      invoice_number
    } = body;

    // Validate required fields
    if (!reference_id) {
      return NextResponse.json(
        { success: false, error: 'reference_id is required' },
        { status: 400 }
      );
    }

    const finalInvoiceNumber = invoice_number || `INV-${String(reference_id).padStart(6, '0')}-${new Date().getFullYear()}`;
    const finalIssueDate = issue_date || new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

    // Fetch columns dynamically
    const [columnsRows]: any = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'invoices'
        AND COLUMN_NAME NOT IN ('id', 'created_at')
    `);
    const invoiceCols: string[] = Array.isArray(columnsRows) ? columnsRows.map((r: any) => r.COLUMN_NAME) : [];

    const cols: string[] = ['invoice_number'];
    const vals: any[] = [finalInvoiceNumber];

    if (invoiceCols.includes('invoice_type')) cols.push('invoice_type'), vals.push(invoice_type);
    if (invoiceCols.includes('reference_id')) cols.push('reference_id'), vals.push(reference_id); // Required field, no null
    if (invoiceCols.includes('customer_id')) cols.push('customer_id'), vals.push(customer_id || null);
    if (invoiceCols.includes('supplier_id')) cols.push('supplier_id'), vals.push(supplier_id || null);
    if (invoiceCols.includes('issue_date')) cols.push('issue_date'), vals.push(finalIssueDate); // Required field
    if (invoiceCols.includes('subtotal')) cols.push('subtotal'), vals.push(Number(subtotal));
    if (invoiceCols.includes('tax_amount')) cols.push('tax_amount'), vals.push(Number(tax_amount));
    if (invoiceCols.includes('total_amount')) cols.push('total_amount'), vals.push(Number(total_amount));
    if (invoiceCols.includes('due_date')) cols.push('due_date'), vals.push(due_date || null);
    if (invoiceCols.includes('stock_id')) cols.push('stock_id'), vals.push(stock_id);
    if (invoiceCols.includes('status')) cols.push('status'), vals.push(status);
    if (invoiceCols.includes('pdf_path')) cols.push('pdf_path'), vals.push(pdf_path || null);

    const placeholders = cols.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO invoices (${cols.join(', ')}) VALUES (${placeholders})`;

    console.log('🗄️ Invoice insert query:', insertQuery, 'Values:', vals);

    const [result] = await pool.query(insertQuery, vals);
    const invoiceId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      data: {
        id: invoiceId,
        invoice_number: finalInvoiceNumber
      },
      message: 'Invoice created successfully'
    });
  } catch (error) {
    console.error('❌ Invoice creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
