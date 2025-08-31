import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ApiResponse, Product } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');
    const reference = searchParams.get('reference');
    const stockId = searchParams.get('stockId'); // Optionnel: pour filtrer par stock

    if (!barcode && !reference) {
      return NextResponse.json(
        { success: false, error: 'Barcode or reference is required' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    // Map stock names to IDs if stockId is provided
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };
    const dbStockId = stockId ? stockMapping[stockId as keyof typeof stockMapping] : null;

    if (barcode) {
      // Search by barcode
      query = `
        SELECT
          p.id,
          p.name,
          p.reference,
          p.description,
          p.price,
          COALESCE(p.quantity, 999999) as quantity,
          p.stock_id,
          p.created_at,
          p.is_active,
          s.name as stock_name,
          GROUP_CONCAT(b.code) as barcodes
        FROM products p
        INNER JOIN barcodes b ON p.id = b.product_id
        LEFT JOIN stocks s ON p.stock_id = s.id
        WHERE b.code = ? AND p.is_active = TRUE
      `;
      params = [barcode];

      // Global products: no stock filter

      query += ' GROUP BY p.id';
    } else {
      // Search by reference
      query = `
        SELECT
          p.id,
          p.name,
          p.reference,
          p.description,
          p.price,
          COALESCE(p.quantity, 999999) as quantity,
          p.stock_id,
          p.created_at,
          p.is_active,
          s.name as stock_name,
          GROUP_CONCAT(b.code) as barcodes
        FROM products p
        LEFT JOIN barcodes b ON p.id = b.product_id
        LEFT JOIN stocks s ON p.stock_id = s.id
        WHERE p.reference = ? AND p.is_active = TRUE
      `;
      params = [reference];

      // Global products: no stock filter

      query += ' GROUP BY p.id';
    }

    const [rows] = await pool.query(query, params);
    const products = Array.isArray(rows) ? rows : [];
    const product = products.length > 0 ? products[0] : null;

    // Process the product data if found
    const processedProduct = product ? {
      ...product,
      price: Number(product.price),
      quantity: Number(product.quantity || 0),
      barcodes: product.barcodes ? product.barcodes.split(',') : [],
      primaryBarcode: product.barcodes ? product.barcodes.split(',')[0] : null
    } : null;

    const response: ApiResponse<Product | null> = {
      success: true,
      data: processedProduct,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Product search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
