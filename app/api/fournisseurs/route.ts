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

    console.log('🔍 Fournisseurs API GET:', { stockId, page, limit, search });

    let stockDbId = 1;
    if (stockId && STOCK_MAPPING[stockId]) {
      stockDbId = STOCK_MAPPING[stockId];
    }

    const offset = (page - 1) * limit;

    let whereClause = `WHERE stock_id = ${stockDbId} AND is_active = 1`;
    if (search.trim()) {
      const escapedSearch = pool.escape(`%${search.trim()}%`);
      whereClause += ` AND (name LIKE ${escapedSearch} OR email LIKE ${escapedSearch} OR contact_person LIKE ${escapedSearch})`;
    }

    const query = `
      SELECT *
      FROM fournisseurs
      ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.query(query);
    const fournisseurs = Array.isArray(rows) ? rows : [];

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM fournisseurs ${whereClause}`;
    const [countRows] = await pool.query(countQuery);
    const totalItems = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    const response = {
      success: true,
      data: fournisseurs,
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
    console.error('❌ Fournisseurs GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Creating fournisseur:', body);

    const { name, email, phone, address, contact_person, payment_terms, stock_id } = body;

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
    const escapedContactPerson = contact_person ? pool.escape(contact_person) : 'NULL';
    const escapedPaymentTerms = payment_terms ? pool.escape(payment_terms) : "'30 jours'";

    const insertQuery = `
      INSERT INTO fournisseurs (name, email, phone, address, contact_person, payment_terms, stock_id, is_active)
      VALUES (${escapedName}, ${escapedEmail}, ${escapedPhone}, ${escapedAddress}, ${escapedContactPerson}, ${escapedPaymentTerms}, ${Number(stock_id)}, 1)
    `;

    const [result] = await pool.query(insertQuery);
    const fournisseurId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      data: { id: fournisseurId },
      message: 'Fournisseur created successfully'
    });
  } catch (error) {
    console.error('❌ Fournisseur creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
