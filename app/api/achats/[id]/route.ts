import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    console.log('🛒 Get single achat:', id);

    const [result] = await pool.query(`
      SELECT 
        a.id,
        a.fournisseur_id,
        a.reference,
        a.total,
        a.payment_method,
        a.payment_status,
        a.delivery_date,
        a.notes,
        a.stock_id,
        a.created_at,
        a.updated_at,
        COALESCE(f.name, 'Fournisseur inconnu') as supplier_name
      FROM achats a
      LEFT JOIN fournisseurs f ON a.fournisseur_id = f.id
      WHERE a.id = ?
    `, [id]);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Achat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error getting achat:', error);
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
    console.log('🛒 Update achat:', id, body);

    const { fournisseur_id, reference, total, payment_method, payment_status, delivery_date, notes } = body;

    const [result] = await pool.query(`
      UPDATE achats 
      SET fournisseur_id = ?, reference = ?, total = ?, payment_method = ?, 
          payment_status = ?, delivery_date = ?, notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [fournisseur_id, reference || '', parseFloat(total), payment_method || 'cash', 
        payment_status || 'pending', delivery_date || null, notes || '', id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Achat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Achat mis à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Error updating achat:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    console.log('🛒 Delete achat:', id);

    const [result] = await pool.query('DELETE FROM achats WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Achat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Achat supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Error deleting achat:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
