import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { STOCK_MAPPING } from '@/lib/types'

const connection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stock',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, stockId } = await request.json()
    
    console.log('🔐 Direct login attempt:', { email, stockId, hasPassword: !!password })
    
    // 1. Find user
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = true',
      [email]
    ) as any[]
    
    if (userRows.length === 0) {
      console.log('❌ User not found:', email)
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }
    
    const user = userRows[0]
    console.log('👤 User found:', { id: user.id, username: user.username, role: user.role, stock_id: user.stock_id })
    
    // 2. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('🔑 Password verification:', { isValid: isValidPassword })
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email)
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }
    
    // 3. Check stock access (skip for super_admin)
    if (user.role !== 'super_admin' && stockId !== 'super-admin') {
      const requiredStockId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]
      
      console.log('🏪 Stock access check:', {
        stockId,
        stockDbId: requiredStockId,
        userStockId: user.stock_id,
        userRole: user.role
      })
      
      if (user.stock_id !== requiredStockId) {
        console.log('❌ Stock access denied:', { userStockId: user.stock_id, requiredStockId })
        return NextResponse.json({ success: false, error: 'Access denied to this stock' }, { status: 403 })
      }
    }
    
    console.log('✅ Authentication successful for:', { email: user.email, role: user.role, stockId })
    
    // 4. Determine redirect URL (temporairement vers dashboard-test)
    let redirectUrl: string
    if (user.role === 'super_admin') {
      redirectUrl = '/dashboard/super-admin'
    } else {
      // Redirection temporaire vers dashboard-test pour éviter l'hydratation
      redirectUrl = '/dashboard-test.html'
    }
    
    // 5. Create user data for localStorage
    const stockDbId = stockId !== "super-admin" ? STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING] : null
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      stockId: stockDbId,
    }
    
    // 6. Return success with redirect URL and user data
    return NextResponse.json({
      success: true,
      redirectUrl,
      userData,
      message: 'Authentication successful'
    })
    
  } catch (error) {
    console.error('❌ Direct login error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
