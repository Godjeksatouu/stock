import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ApiResponse, STOCK_MAPPING } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let stockId = searchParams.get('stockId');
    const period = searchParams.get('period') || '7';

    console.log('📊 Statistics API - GET request:', { stockId, period });

    // Map stockId from string to number if needed
    let stockDbId: number | undefined;
    if (stockId) {
      if (typeof stockId === 'string' && STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]) {
        stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING];
        console.log('🔄 Mapped stockId:', { from: stockId, to: stockDbId });
      } else if (!isNaN(parseInt(stockId))) {
        stockDbId = parseInt(stockId);
      } else {
        stockDbId = 1; // Default to Al Ouloum
      }
    }

    // Base statistics object
    const statistics: any = {
      products_count: 0,
      clients_count: 0,
      sales_count: 0,
      total_sales_amount: 0,
      recent_sales: [],
      // Performance cards expected by frontend
      todaySales: { today_revenue: 0, today_sales_count: 0 },
      weekSales: { week_revenue: 0, week_sales_count: 0 },
      monthSales: { month_revenue: 0, month_sales_count: 0 },
      sales: { total_sales: 0, total_revenue: 0 }, // last 7 days
      dailySales: [],
      period: period,
      stock_id: stockDbId,
    };

    try {
      // Determine if products/clients/sales have stock_id column
      let hasProductsStockId = false;
      let hasClientsStockId = false;
      let hasSalesStockId = true; // default true in our schema
      try {
        const [pCols] = await pool.execute('SHOW COLUMNS FROM products LIKE "stock_id"');
        hasProductsStockId = Array.isArray(pCols) && (pCols as any[]).length > 0;
      } catch {}
      try {
        const [cCols] = await pool.execute('SHOW COLUMNS FROM clients LIKE "stock_id"');
        hasClientsStockId = Array.isArray(cCols) && (cCols as any[]).length > 0;
      } catch {}
      try {
        const [sCols] = await pool.execute('SHOW COLUMNS FROM sales LIKE "stock_id"');
        hasSalesStockId = Array.isArray(sCols) && (sCols as any[]).length > 0;
      } catch {}

      // Count products
      let productsQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
      const productsParams: any[] = [];
      if (stockDbId && hasProductsStockId) {
        productsQuery += ' AND stock_id = ?';
        productsParams.push(stockDbId);
      }
      const [productsResult] = await pool.execute(productsQuery, productsParams);
      statistics.products_count = (productsResult as any[])[0]?.count || 0;

      // Count clients
      let clientsQuery = 'SELECT COUNT(*) as count FROM clients WHERE 1=1';
      const clientsParams: any[] = [];
      if (stockDbId && hasClientsStockId) {
        clientsQuery += ' AND stock_id = ?';
        clientsParams.push(stockDbId);
      }
      const [clientsResult] = await pool.execute(clientsQuery, clientsParams);
      statistics.clients_count = (clientsResult as any[])[0]?.count || 0;

      // Global sales count and total (all-time)
      let salesQuery = 'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE 1=1';
      const salesParams: any[] = [];
      if (stockDbId && hasSalesStockId) {
        salesQuery += ' AND stock_id = ?';
        salesParams.push(stockDbId);
      }
      const [salesResult] = await pool.execute(salesQuery, salesParams);
      const salesData = (salesResult as any[])[0] || { count: 0, total: 0 };
      statistics.sales_count = salesData.count || 0;
      statistics.total_sales_amount = parseFloat(salesData.total) || 0;

      // Performance metrics
      const stockFilterClause = stockDbId && hasSalesStockId ? ' AND stock_id = ?' : '';
      const stockFilterParams = stockDbId && hasSalesStockId ? [stockDbId] : [];

      // Today - paid only
      const [todayRows] = await pool.execute(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
         FROM sales
         WHERE DATE(created_at) = CURDATE()
           AND payment_status = 'paid'${stockFilterClause}`,
        stockFilterParams
      );
      const today = (todayRows as any[])[0] || { count: 0, total: 0 };
      statistics.todaySales = {
        today_revenue: parseFloat(today.total) || 0,
        today_sales_count: today.count || 0,
      };

      // This week (from Monday) - paid only
      const [weekRows] = await pool.execute(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
         FROM sales
         WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
           AND payment_status = 'paid'${stockFilterClause}`,
        stockFilterParams
      );
      const week = (weekRows as any[])[0] || { count: 0, total: 0 };
      statistics.weekSales = {
        week_revenue: parseFloat(week.total) || 0,
        week_sales_count: week.count || 0,
      };

      // This month - paid only
      const [monthRows] = await pool.execute(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
         FROM sales
         WHERE YEAR(created_at) = YEAR(CURDATE())
           AND MONTH(created_at) = MONTH(CURDATE())
           AND payment_status = 'paid'${stockFilterClause}`,
        stockFilterParams
      );
      const month = (monthRows as any[])[0] || { count: 0, total: 0 };
      statistics.monthSales = {
        month_revenue: parseFloat(month.total) || 0,
        month_sales_count: month.count || 0,
      };

      // Last 7 days totals (including today) - paid only
      const [last7Rows] = await pool.execute(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
         FROM sales
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           AND payment_status = 'paid'${stockFilterClause}`,
        stockFilterParams
      );
      const last7 = (last7Rows as any[])[0] || { count: 0, total: 0 };
      statistics.sales = {
        total_sales: last7.count || 0,
        total_revenue: parseFloat(last7.total) || 0,
      };

      // Daily breakdown for last 7 days
      const [dailyRows] = await pool.execute(
        `SELECT DATE(created_at) as date,
                COALESCE(SUM(total),0) as daily_revenue,
                COUNT(*) as sales_count
         FROM sales
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           AND payment_status = 'paid'${stockFilterClause}
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC`,
        stockFilterParams
      );
      statistics.dailySales = dailyRows;

      // Get recent sales (last 5)
      let recentSalesQuery = 'SELECT * FROM sales WHERE 1=1';
      const recentSalesParams: any[] = [];
      if (stockDbId && hasSalesStockId) {
        recentSalesQuery += ' AND stock_id = ?';
        recentSalesParams.push(stockDbId);
      }
      recentSalesQuery += ' ORDER BY created_at DESC LIMIT 5';
      const [recentSalesResult] = await pool.execute(recentSalesQuery, recentSalesParams);
      statistics.recent_sales = recentSalesResult;

    } catch (error) {
      console.error('⚠️ Error getting statistics:', error);
      // Return basic statistics even if some queries fail
    }

    console.log('📊 Statistics result:', statistics);

    const response: ApiResponse<any> = {
      success: true,
      data: statistics,
      message: 'Statistics retrieved successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Statistics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
