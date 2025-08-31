import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Get customers list');

    const [result] = await pool.query(`
      SELECT id, name, email, phone, address
      FROM customers
      ORDER BY name ASC
    `);

    return NextResponse.json({
      success: true,
      data: result || []
    });

  } catch (error) {
    console.error('❌ Error getting customers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: [] },
      { status: 500 }
    );
  }
}
