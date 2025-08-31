import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test Products API called');
    
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId') || 'al-ouloum';

    // Map stock names to IDs
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    const dbStockId = stockMapping[stockId as keyof typeof stockMapping] || 1;
    
    console.log('🧪 Testing stock:', stockId, '→', dbStockId);

    // Simple query to test database structure
    const [products] = await pool.query(`
      SELECT 
        id,
        name,
        COALESCE(reference, '') as reference,
        COALESCE(price, 0) as price,
        stock_id,
        quantity,
        is_active
      FROM products 
      WHERE stock_id = ? AND is_active = 1
      LIMIT 10
    `, [dbStockId]);

    console.log('🧪 Found products:', products.length);

    return NextResponse.json({
      success: true,
      stockId,
      dbStockId,
      productsFound: products.length,
      products: products, // Full products array
      sampleProducts: products.slice(0, 3),
      message: 'Test API working - database structure is correct'
    });

  } catch (error) {
    console.error('🧪 Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Test API failed'
    }, { status: 500 });
  }
}
