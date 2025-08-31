import { NextRequest, NextResponse } from 'next/server'
import { getMany } from '@/lib/database'
import { ApiResponse, STOCK_MAPPING } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const stockId = searchParams.get('stockId')
    const searchType = searchParams.get('type') // 'barcode' or 'client' or 'all'

    if (!query || query.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Paramètre de recherche requis'
      }, { status: 400 })
    }

    let sqlQuery = `
      SELECT s.*,
             c.name as client_name,
             c.phone as client_phone,
             c.address as client_address,
             u.username,
             st.name as stock_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN stocks st ON s.stock_id = st.id
      WHERE 1=1
    `
    let params: any[] = []

    // Filter by stock if provided
    if (stockId && stockId !== 'super-admin') {
      const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]
      if (stockDbId) {
        sqlQuery += ' AND s.stock_id = ?'
        params.push(stockDbId)
      }
    }

    // Add search conditions based on type
    if (searchType === 'barcode') {
      // Search only by barcode
      sqlQuery += ' AND s.barcode = ?'
      params.push(query.trim())
    } else if (searchType === 'client') {
      // Search only by client name
      sqlQuery += ' AND c.name LIKE ?'
      params.push(`%${query.trim()}%`)
    } else {
      // Search by both barcode and client name (default)
      sqlQuery += ' AND (s.barcode = ? OR c.name LIKE ?)'
      params.push(query.trim(), `%${query.trim()}%`)
    }

    sqlQuery += ' ORDER BY s.created_at DESC LIMIT 50'

    console.log('Search query:', sqlQuery)
    console.log('Search params:', params)

    const result = await getMany(sqlQuery, params)

    if (result.success) {
      // Get sale items for each sale
      const salesWithItems = await Promise.all(
        result.data.map(async (sale: any) => {
          const itemsResult = await getMany(`
            SELECT si.*, p.name as product_name, p.reference
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
          `, [sale.id])

          const items = itemsResult.success ? itemsResult.data : []
          const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0)

          return {
            ...sale,
            items: items,
            total_quantity: totalQuantity
          }
        })
      )

      return NextResponse.json({
        success: true,
        data: salesWithItems,
        message: `${salesWithItems.length} vente(s) trouvée(s)`
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la recherche'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error searching sales:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la recherche'
    }, { status: 500 })
  }
}
