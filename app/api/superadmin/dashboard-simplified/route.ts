import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching simplified superadmin dashboard data...');

    let dashboardData = {
      totalRevenue: 0,
      totalProfits: 0,
      totalProducts: 0,
      totalSales: 0,
      stocksData: {},
      users: []
    };

    // Stock mapping
    const stockMapping = {
      1: 'al-ouloum',
      2: 'renaissance', 
      3: 'gros'
    };

    const stockNames = {
      1: 'Librairie Al Ouloum',
      2: 'Librairie La Renaissance',
      3: 'Gros (Dépôt général)'
    };

    try {
      // 1. Calculer le CA total et nombre de ventes
      console.log('💰 Calculating total revenue...');
      const [revenueRows] = await pool.query(`
        SELECT
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(*) as total_sales_count
        FROM sales
        WHERE total IS NOT NULL AND total > 0
      `);

      if (revenueRows && revenueRows[0]) {
        dashboardData.totalRevenue = parseFloat(revenueRows[0].total_revenue || 0);
        dashboardData.totalSales = revenueRows[0].total_sales_count || 0;
      }
    } catch (error) {
      console.error('❌ Error calculating revenue:', error.message);
    }

    try {
      // 2. Calculer les bénéfices estimés (30% du CA pour estimation)
      dashboardData.totalProfits = dashboardData.totalRevenue * 0.3;
    } catch (error) {
      console.error('❌ Error calculating profits:', error.message);
    }

    try {
      // 3. Compter le nombre total de produits
      console.log('📦 Counting total products...');
      const [productsRows] = await pool.query(`
        SELECT COUNT(*) as total_products
        FROM products 
        WHERE is_active = 1
      `);

      if (productsRows && productsRows[0]) {
        dashboardData.totalProducts = productsRows[0].total_products || 0;
      }
    } catch (error) {
      console.error('❌ Error counting products:', error.message);
    }

    try {
      // 4. Données par stock pour les blocs d'accès
      console.log('🏢 Fetching data by stock...');
      const [stockDataRows] = await pool.query(`
        SELECT
          s.id as stock_id,
          s.name as stock_name,
          COUNT(DISTINCT p.id) as products_count,
          COALESCE(SUM(sa.total), 0) as stock_revenue,
          COUNT(DISTINCT sa.id) as sales_count
        FROM stocks s
        LEFT JOIN products p ON s.id = p.stock_id AND p.is_active = 1
        LEFT JOIN sales sa ON s.id = sa.stock_id AND sa.total > 0
        GROUP BY s.id, s.name
        ORDER BY s.id
      `);

      if (stockDataRows && stockDataRows.length > 0) {
        stockDataRows.forEach(row => {
          const stockKey = stockMapping[row.stock_id] || `stock_${row.stock_id}`;
          dashboardData.stocksData[stockKey] = {
            name: row.stock_name,
            products: row.products_count || 0,
            revenue: parseFloat(row.stock_revenue || 0),
            sales: row.sales_count || 0
          };
        });
      }
    } catch (error) {
      console.error('❌ Error fetching stock data:', error.message);
    }

    try {
      // 5. Récupérer les utilisateurs
      console.log('👥 Fetching users...');
      const [usersRows] = await pool.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.stock_id,
          u.is_active,
          s.name as stock_name,
          u.created_at
        FROM users u
        LEFT JOIN stocks s ON u.stock_id = s.id
        WHERE u.username IS NOT NULL AND u.email IS NOT NULL
        ORDER BY u.created_at DESC
      `);

      if (usersRows && usersRows.length > 0) {
        dashboardData.users = usersRows.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          stock_id: user.stock_id,
          stock_name: user.stock_name,
          active: user.is_active === 1,
          created_at: user.created_at
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error.message);
    }

    console.log('✅ Simplified dashboard data compiled successfully');
    console.log('📊 Summary:', {
      totalRevenue: dashboardData.totalRevenue,
      totalProducts: dashboardData.totalProducts,
      totalUsers: dashboardData.users.length,
      stocksCount: Object.keys(dashboardData.stocksData).length
    });

    return NextResponse.json({
      success: true,
      data: dashboardData,
      message: 'Simplified dashboard data loaded successfully'
    });

  } catch (error) {
    console.error('❌ Critical error in simplified superadmin dashboard API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des données',
        details: error.message
      },
      { status: 500 }
    );
  }
}
