import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const query = `SELECT * FROM clients WHERE id = ${clientId} AND is_active = 1`;
    const [rows] = await pool.query(query);
    const clients = Array.isArray(rows) ? rows : [];

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: clients[0]
    });
  } catch (error) {
    console.error('❌ Client GET error:', error);
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
    const clientId = parseInt(params.id);
    const body = await request.json();

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const { name, email, phone, address } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const escapedName = pool.escape(name);
    const escapedEmail = email ? pool.escape(email) : 'NULL';
    const escapedPhone = phone ? pool.escape(phone) : 'NULL';
    const escapedAddress = address ? pool.escape(address) : 'NULL';

    const updateQuery = `
      UPDATE clients 
      SET name = ${escapedName}, 
          email = ${escapedEmail}, 
          phone = ${escapedPhone}, 
          address = ${escapedAddress}
      WHERE id = ${clientId}
    `;

    await pool.query(updateQuery);

    return NextResponse.json({
      success: true,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('❌ Client update error:', error);
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
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    // Soft delete
    const deleteQuery = `UPDATE clients SET is_active = 0 WHERE id = ${clientId}`;
    await pool.query(deleteQuery);

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('❌ Client deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
