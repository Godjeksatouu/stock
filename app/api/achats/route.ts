import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🛒 Achats API called');
    
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';

    console.log('🛒 Request params:', { stockId, page, limit, search });

    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    let dbStockId = null;
    if (stockId) {
      dbStockId = stockMapping[stockId as keyof typeof stockMapping];
      console.log('🛒 Mapped stockId:', stockId, '→', dbStockId);
    }

    const offset = (page - 1) * limit;

    try {
      let whereClause = '';
      let queryParams = [];
      
      if (dbStockId) {
        whereClause = 'WHERE a.stock_id = ?';
        queryParams.push(dbStockId);
      }

      if (search && search.trim()) {
        const searchCondition = whereClause ? ' AND ' : 'WHERE ';
        whereClause += searchCondition + '(a.reference LIKE ? OR f.name LIKE ? OR a.notes LIKE ?)';
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM achats a
        LEFT JOIN fournisseurs f ON a.fournisseur_id = f.id
        ${whereClause}
      `;
      
      const [countRows] = await pool.query(countQuery, queryParams);
      const total = countRows[0]?.total || 0;

      const achatsQuery = `
        SELECT 
          a.id,
          a.fournisseur_id,
          a.reference,
          COALESCE(f.name, 'Fournisseur inconnu') as supplier_name,
          a.total,
          a.payment_method,
          a.payment_status,
          a.delivery_date,
          a.notes,
          a.stock_id,
          a.created_at,
          a.updated_at
        FROM achats a
        LEFT JOIN fournisseurs f ON a.fournisseur_id = f.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [achatsResult] = await pool.query(achatsQuery, [...queryParams, limit, offset]);
      const achats = Array.isArray(achatsResult) ? achatsResult : [];
      
      console.log(`✅ Found ${achats.length} achats for stock ${stockId || 'all'}`);

      return NextResponse.json({
        success: true,
        data: {
          achats: achats,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          stockInfo: {
            stockId: stockId || 'all',
            dbStockId: dbStockId || 0,
            name: stockId ? (
              stockId === 'al-ouloum' ? 'Librairie Al Ouloum' : 
              stockId === 'renaissance' ? 'Librairie La Renaissance' : 
              'Gros (Dépôt général)'
            ) : 'Tous les stocks'
          }
        }
      });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: dbError.message,
        data: {
          achats: [],
          pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
          stockInfo: { stockId: stockId || 'unknown', dbStockId: dbStockId || 0, name: 'Unknown' }
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ General error in achats API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      data: {
        achats: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
        stockInfo: { stockId: 'unknown', dbStockId: 0, name: 'Unknown' }
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Creating new achat');
    
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    const dbStockId = stockId ? stockMapping[stockId as keyof typeof stockMapping] : 1;
    const body = await request.json();
    
    console.log('🛒 Received data:', body);
    
    const { fournisseur_id, reference, total, payment_method, payment_status, delivery_date, notes } = body;

    // Validation
    if (!fournisseur_id) {
      return NextResponse.json(
        { success: false, error: 'Fournisseur est requis' },
        { status: 400 }
      );
    }

    if (!total || parseFloat(total) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Montant total doit être supérieur à 0' },
        { status: 400 }
      );
    }

    try {
      const [result] = await pool.query(`
        INSERT INTO achats (fournisseur_id, stock_id, reference, total, payment_method, payment_status, delivery_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        parseInt(fournisseur_id), 
        dbStockId, 
        reference || '', 
        parseFloat(total), 
        payment_method || 'cash', 
        payment_status || 'pending',
        delivery_date || null,
        notes || ''
      ]);

      console.log(`✅ Achat created successfully:`, { 
        id: result.insertId, 
        fournisseur_id: parseInt(fournisseur_id),
        total: parseFloat(total),
        stock_id: dbStockId 
      });

      return NextResponse.json({
        success: true,
        data: {
          id: result.insertId,
          fournisseur_id: parseInt(fournisseur_id),
          stock_id: dbStockId,
          reference: reference || '',
          total: parseFloat(total),
          payment_method: payment_method || 'cash',
          payment_status: payment_status || 'pending',
          delivery_date,
          notes: notes || ''
        },
        message: 'Achat créé avec succès'
      });

    } catch (dbError) {
      console.error('❌ Database error creating achat:', dbError);
      return NextResponse.json(
        { success: false, error: 'Erreur de base de données lors de la création', details: dbError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error creating achat:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur', details: error.message },
      { status: 500 }
    );
  }
}
