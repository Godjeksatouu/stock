import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fournisseurId = parseInt(params.id);
    if (isNaN(fournisseurId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fournisseur ID' },
        { status: 400 }
      );
    }

    const query = `SELECT * FROM fournisseurs WHERE id = ${fournisseurId} AND is_active = 1`;
    const [rows] = await pool.query(query);
    const fournisseurs = Array.isArray(rows) ? rows : [];

    if (fournisseurs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Fournisseur not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: fournisseurs[0]
    });
  } catch (error) {
    console.error('❌ Fournisseur GET error:', error);
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
    const fournisseurId = parseInt(params.id);
    const body = await request.json();

    if (isNaN(fournisseurId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fournisseur ID' },
        { status: 400 }
      );
    }

    const { name, email, phone, address, contact_person, payment_terms } = body;

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
    const escapedContactPerson = contact_person ? pool.escape(contact_person) : 'NULL';
    const escapedPaymentTerms = payment_terms ? pool.escape(payment_terms) : "'30 jours'";

    const updateQuery = `
      UPDATE fournisseurs
      SET name = ${escapedName},
          email = ${escapedEmail},
          phone = ${escapedPhone},
          address = ${escapedAddress},
          contact_person = ${escapedContactPerson},
          payment_terms = ${escapedPaymentTerms}
      WHERE id = ${fournisseurId}
    `;

    await pool.query(updateQuery);

    return NextResponse.json({
      success: true,
      message: 'Fournisseur updated successfully'
    });
  } catch (error) {
    console.error('❌ Fournisseur update error:', error);
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
    const fournisseurId = parseInt(params.id);

    if (isNaN(fournisseurId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fournisseur ID' },
        { status: 400 }
      );
    }

    // Soft delete
    const deleteQuery = `UPDATE fournisseurs SET is_active = 0 WHERE id = ${fournisseurId}`;
    await pool.query(deleteQuery);

    return NextResponse.json({
      success: true,
      message: 'Fournisseur deleted successfully'
    });
  } catch (error) {
    console.error('❌ Fournisseur deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
