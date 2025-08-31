import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

const STOCK_MAPPING: { [key: string]: number } = {
  'al-ouloum': 1,
  'renaissance': 2,
  'gros': 3
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';

    console.log('🔍 Clients API GET:', { stockId, page, limit, search });

    let stockDbId = 1;
    if (stockId && STOCK_MAPPING[stockId]) {
      stockDbId = STOCK_MAPPING[stockId];
    }

    const offset = (page - 1) * limit;

    let whereClause = `WHERE stock_id = ${stockDbId} AND is_active = 1`;
    if (search.trim()) {
      const escapedSearch = pool.escape(`%${search.trim()}%`);
      whereClause += ` AND (name LIKE ${escapedSearch} OR email LIKE ${escapedSearch} OR phone LIKE ${escapedSearch})`;
    }

    const query = `
      SELECT *
      FROM clients
      ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.query(query);
    const clients = Array.isArray(rows) ? rows : [];

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM clients ${whereClause}`;
    const [countRows] = await pool.query(countQuery);
    const totalItems = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    const response = {
      success: true,
      data: clients,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Clients GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creating client:', body);

    const { name, email, phone, address, stock_id } = body;

    if (!name || !stock_id) {
      return NextResponse.json(
        { success: false, error: 'Name and stock ID are required' },
        { status: 400 }
      );
    }

    const escapedName = pool.escape(name);
    const escapedEmail = email ? pool.escape(email) : 'NULL';
    const escapedPhone = phone ? pool.escape(phone) : 'NULL';
    const escapedAddress = address ? pool.escape(address) : 'NULL';

    const insertQuery = `
      INSERT INTO clients (name, email, phone, address, stock_id, is_active)
      VALUES (${escapedName}, ${escapedEmail}, ${escapedPhone}, ${escapedAddress}, ${Number(stock_id)}, 1)
    `;

    const [result] = await pool.query(insertQuery);
    const clientId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      data: { id: clientId },
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('❌ Client creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
