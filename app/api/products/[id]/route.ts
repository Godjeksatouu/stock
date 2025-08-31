import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ApiResponse, Product, UpdateProductRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting individual product:', productId);

    // Use pool.query instead of getOne to avoid function signature issues
    const query = `
      SELECT p.*, GROUP_CONCAT(b.code) as barcodes
      FROM products p
      LEFT JOIN barcodes b ON p.id = b.product_id
      WHERE p.id = ${productId}
      GROUP BY p.id
    `;

    const [rows] = await pool.query(query);
    const products = Array.isArray(rows) ? rows : [];

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = products[0] as any;

    // Process barcodes and ensure proper types
    const processedProduct = {
      ...product,
      price: Number(product.price),
      barcodes: product.barcodes ? product.barcodes.split(',') : []
    };

    console.log('✅ Product found:', processedProduct.name);

    const response: ApiResponse<Product> = {
      success: true,
      data: processedProduct,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Product fetch error:', error);
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
    const productId = parseInt(params.id);
    const body: UpdateProductRequest = await request.json();

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    console.log('📝 Updating product:', productId, body);

    const { name, reference, description, price, quantity, stock_id, barcodes } = body;

    // Escape values for direct query (avoid prepared statements)
    const escapedName = pool.escape(name);
    const escapedReference = reference ? pool.escape(reference) : 'NULL';
    const escapedDescription = description ? pool.escape(description) : 'NULL';
    const escapedPrice = Number(price || 0);

    // Update product using direct query
    const updateQuery = `
      UPDATE products 
      SET name = ${escapedName}, 
          reference = ${escapedReference}, 
          description = ${escapedDescription}, 
          price = ${escapedPrice}
      WHERE id = ${productId}
    `;

    console.log('🗄️ Update query:', updateQuery);

    const [updateResult] = await pool.query(updateQuery);
    console.log('✅ Product updated');

    // Update product_stocks if quantity and stock_id provided
    if (quantity !== undefined && stock_id !== undefined) {
      const stockUpdateQuery = `
        UPDATE product_stocks 
        SET quantity = ${Number(quantity)}
        WHERE product_id = ${productId} AND stock_id = ${Number(stock_id)}
      `;
      
      await pool.query(stockUpdateQuery);
      console.log('✅ Product stock updated');
    }

    // Update barcodes if provided
    if (barcodes !== undefined) {
      // Delete existing barcodes
      const deleteBarcodeQuery = `DELETE FROM barcodes WHERE product_id = ${productId}`;
      await pool.query(deleteBarcodeQuery);
      console.log('✅ Old barcodes deleted');

      // Insert new barcodes
      if (Array.isArray(barcodes) && barcodes.length > 0) {
        for (const barcode of barcodes) {
          if (barcode && barcode.trim()) {
            const escapedBarcode = pool.escape(barcode.trim());
            const insertBarcodeQuery = `INSERT INTO barcodes (product_id, code) VALUES (${productId}, ${escapedBarcode})`;
            await pool.query(insertBarcodeQuery);
          }
        }
        console.log('✅ New barcodes inserted');
      }
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Product updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Product update error:', error);
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
    const productId = parseInt(params.id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting product:', productId);

    // Delete related barcodes first
    const deleteBarcodeQuery = `DELETE FROM barcodes WHERE product_id = ${productId}`;
    await pool.query(deleteBarcodeQuery);
    console.log('✅ Barcodes deleted');

    // Delete product using direct query
    const deleteQuery = `DELETE FROM products WHERE id = ${productId}`;
    const [deleteResult] = await pool.query(deleteQuery);

    console.log('✅ Product deleted');

    const response: ApiResponse<null> = {
      success: true,
      message: 'Product deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Product deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
