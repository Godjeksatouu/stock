import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📦 Main Products API called');
    
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';

    console.log('📦 Request params:', { stockId, page, limit, search });

    if (!stockId) {
      console.log('❌ No stockId provided');
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    // Map stock names to IDs
    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    const dbStockId = stockMapping[stockId as keyof typeof stockMapping];
    
    if (!dbStockId) {
      console.log('❌ Invalid stockId:', stockId);
      return NextResponse.json(
        { success: false, error: `Invalid stock ID: ${stockId}` },
        { status: 400 }
      );
    }

    console.log('📦 Mapped stockId:', stockId, '→', dbStockId);

    const offset = (page - 1) * limit;

    try {
      // Use the unified products table with stock_id
      console.log('🔍 Fetching products for stock:', dbStockId);

      // Build where clause for GLOBAL products (shared across stocks)
      let whereClause = 'WHERE p.is_active = TRUE';
      let queryParams: any[] = [];

      // Add search condition - search in name, reference, and barcodes
      if (search && search.trim()) {
        whereClause += ` AND (
          p.name LIKE ?
          OR p.reference LIKE ?
          OR EXISTS (
            SELECT 1 FROM barcodes b
            WHERE b.product_id = p.id
            AND b.code LIKE ?
          )
        )`;
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      console.log('📦 Where clause:', whereClause);
      console.log('📦 Query params:', queryParams);
      console.log('🔍 Search includes barcode search:', search && search.trim() ? 'YES' : 'NO');
      console.log('🔍 Search term:', search);

      // Get total count using simplified query
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM products p
        ${whereClause}
      `;
      console.log('📊 Count query:', countQuery);

      const [countRows] = await pool.query(countQuery, queryParams);
      const total = countRows[0]?.total || 0;
      console.log('📊 Total products found:', total);

      // Get products with barcodes (simplified query)
      const productsQuery = `
        SELECT
          p.id,
          p.name,
          COALESCE(p.reference, '') as reference,
          COALESCE(p.description, '') as description,
          COALESCE(p.price, 0) as price,
          p.created_at,
          p.stock_id,
          COALESCE(p.quantity, 999999) as quantity,
          p.is_active,
          p.updated_at,
          GROUP_CONCAT(b.code) as barcodes
        FROM products p
        LEFT JOIN barcodes b ON p.id = b.product_id
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.name ASC
        LIMIT ? OFFSET ?
      `;

      console.log('📦 Products query:', productsQuery);
      const [productsResult] = await pool.query(productsQuery, [...queryParams, limit, offset]);

      // Process products data
      const products = Array.isArray(productsResult) ? productsResult.map((product: any) => ({
        id: product.id,
        name: product.name,
        reference: product.reference || '',
        description: product.description || '',
        price: parseFloat(product.price) || 0,
        created_at: product.created_at,
        stock_id: product.stock_id,
        quantity: parseInt(product.quantity) || 0,
        min_quantity: parseInt(product.min_quantity) || 0,
        max_quantity: product.max_quantity ? parseInt(product.max_quantity) : null,
        location: product.location || '',
        last_updated: product.last_updated,
        barcodes: product.barcodes ? product.barcodes.split(',').filter(Boolean) : [],
        primaryBarcode: product.barcodes ? product.barcodes.split(',')[0] : null,
        is_active: 1 // Default to active
      })) : [];

      console.log(`✅ Found ${products.length} products for stock ${stockId} (ID: ${dbStockId})`);

      const result = {
        success: true,
        data: {
          products: products,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          stockInfo: {
            stockId,
            dbStockId,
            name: stockId === 'al-ouloum' ? 'Librairie Al Ouloum' :
                  stockId === 'renaissance' ? 'Librairie La Renaissance' :
                  'Gros (Dépôt général)',
            hasStockId: true,
            hasQuantity: true,
            hasIsActive: true
          }
        }
      };

      console.log('✅ API Response structure:', {
        success: result.success,
        productsCount: result.data.products.length,
        productsIsArray: Array.isArray(result.data.products),
        total: result.data.pagination.total,
        stockId: result.data.stockInfo.stockId,
        tableFeatures: { hasStockId: true, hasQuantity: true, hasIsActive: true }
      });

      return NextResponse.json(result);

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database error',
          details: dbError.message,
          data: {
            products: [],
            pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
            stockInfo: { stockId, dbStockId, name: 'Unknown' }
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ General error in products API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message,
        data: {
          products: [],
          pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
          stockInfo: { stockId: 'unknown', dbStockId: 0, name: 'Unknown' }
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📦 Creating new product');

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    const stockMapping = {
      'al-ouloum': 1,
      'renaissance': 2,
      'gros': 3
    };

    const dbStockId = stockMapping[stockId as keyof typeof stockMapping];

    if (!dbStockId) {
      return NextResponse.json(
        { success: false, error: 'Invalid stock ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, reference, description, price, quantity, barcodes } = body;

    console.log('📦 Raw request body:', body);
    console.log('📦 Product data:', { name, reference, description, price, quantity, barcodes, stockId, dbStockId });
    console.log('📦 Validation check:', {
      hasName: !!name,
      hasPrice: !!price,
      hasQuantity: quantity !== undefined,
      priceType: typeof price,
      quantityType: typeof quantity
    });

    if (!name || !price || quantity === undefined) {
      console.log('❌ Validation failed:', { name, price, quantity });
      return NextResponse.json(
        { success: false, error: 'Name, price, and quantity are required', received: { name, price, quantity } },
        { status: 400 }
      );
    }

    try {
      // Start transaction
      await pool.query('START TRANSACTION');

      // 1. First, check if product already exists by name and reference
      let existingProduct = null;
      if (reference && reference.trim()) {
        const [existingByRef] = await pool.query(
          'SELECT id FROM products WHERE reference = ?',
          [reference.trim()]
        );
        if (existingByRef.length > 0) {
          existingProduct = existingByRef[0];
        }
      }

      // If no existing product found by reference, check by name
      if (!existingProduct) {
        const [existingByName] = await pool.query(
          'SELECT id FROM products WHERE name = ?',
          [name.trim()]
        );
        if (existingByName.length > 0) {
          existingProduct = existingByName[0];
        }
      }

      let productId;

      if (existingProduct) {
        // Product exists, use existing ID
        productId = existingProduct.id;
        console.log(`📦 Using existing product ID: ${productId}`);
      } else {
        // 2. Insert new product into products table as GLOBAL (shared across stocks)
        const insertProductQuery = `
          INSERT INTO products (name, reference, description, price, stock_id, quantity, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, ?, ?, NOW(), NOW())
        `;

        const [result] = await pool.query(insertProductQuery, [
          name,
          reference || null,
          description || null,
          parseFloat(price),
          999999, // Stock illimité
          true
        ]);

        productId = result.insertId;
        console.log(`📦 Created new product with ID: ${productId}`);
      }

      // 3. Update product if it already exists: keep it GLOBAL (no stock binding)
      if (existingProduct) {
        await pool.query(
          'UPDATE products SET stock_id = NULL, quantity = 999999, is_active = TRUE, updated_at = NOW() WHERE id = ?',
          [productId]
        );
        console.log('📦 Updated existing product as GLOBAL');
      }

      // 5. Insert barcodes if provided
      if (Array.isArray(barcodes) && barcodes.length > 0) {
        for (const barcode of barcodes) {
          if (barcode && barcode.trim()) {
            try {
              // Check if barcode already exists
              const [existingBarcode] = await pool.query(
                'SELECT id FROM barcodes WHERE code = ?',
                [barcode.trim()]
              );

              if (existingBarcode.length === 0) {
                await pool.query(
                  'INSERT INTO barcodes (product_id, code) VALUES (?, ?)',
                  [productId, barcode.trim()]
                );
                console.log(`✅ Barcode ${barcode} added to product ${productId}`);
              } else {
                console.log(`⚠️ Barcode ${barcode} already exists`);
              }
            } catch (barcodeError) {
              console.warn(`⚠️ Failed to add barcode ${barcode}:`, barcodeError.message);
            }
          }
        }
      }

      // Commit transaction
      await pool.query('COMMIT');

      console.log(`✅ Product created/updated for stock ${stockId}:`, {
        id: productId,
        name,
        price,
        quantity,
        stock_id: dbStockId,
        barcodes: barcodes || []
      });

      return NextResponse.json({
        success: true,
        data: {
          id: productId,
          name,
          reference: reference || '',
          description: description || '',
          price: parseFloat(price),
          quantity: 999999, // Stock illimité
          stock_id: dbStockId,
          barcodes: barcodes || []
        },
        message: 'Produit créé avec succès'
      });

    } catch (dbError) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      console.error('❌ Database error creating product:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database error creating product', details: dbError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
