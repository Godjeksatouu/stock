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
    // Handle both JSON and form data
    let email, password, stockId

    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await request.json()
      email = data.email
      password = data.password
      stockId = data.stockId
    } else {
      // Handle form data
      const formData = await request.formData()
      email = formData.get('email') as string
      password = formData.get('password') as string
      stockId = formData.get('stockId') as string
    }
    
    console.log('🔐 Server login attempt:', { email, stockId, hasPassword: !!password })
    
    // 1. Find user
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = true',
      [email]
    ) as any[]
    
    if (userRows.length === 0) {
      console.log('❌ User not found:', email)
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    const user = userRows[0]
    console.log('✅ User found:', { id: user.id, username: user.username, role: user.role, stock_id: user.stock_id })
    
    // 2. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('🔑 Password verification:', { isValid: isValidPassword })
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email)
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // 3. Check stock access (skip for super_admin)
    if (user.role !== 'super_admin') {
      const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]
      
      console.log('🏪 Stock access check:', {
        stockId,
        stockDbId,
        userStockId: user.stock_id,
        userRole: user.role
      })
      
      if (user.stock_id !== stockDbId) {
        console.log('❌ Stock access denied:', { userStockId: user.stock_id, requiredStockId: stockDbId })
        return NextResponse.json(
          { success: false, error: 'Access denied to this stock' },
          { status: 403 }
        )
      }
    }
    
    console.log('✅ Authentication successful for:', {
      email: user.email,
      role: user.role,
      stockId
    })
    
    // 4. Create user data for localStorage
    const stockDbId = stockId !== "super-admin" ? STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING] : null
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      stockId: stockDbId,
    }
    
    // 5. Create HTML page with auto-redirect and localStorage setup
    const dashboardUrl = user.role === 'caissier' 
      ? `/dashboard-test.html` 
      : user.role === 'super_admin' 
        ? `/dashboard/super-admin`
        : `/dashboard-test.html`
    
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion réussie</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        .success {
            color: #28a745;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">✅ Connexion réussie !</div>
        <div class="spinner"></div>
        <p>Redirection vers le dashboard...</p>
        <p><strong>Utilisateur:</strong> ${user.email}</p>
        <p><strong>Rôle:</strong> ${user.role}</p>
        <p><strong>Stock:</strong> ${stockId}</p>
    </div>
    
    <script>
        console.log('🎯 Setting up user data and redirecting...');
        
        // Clear any existing data
        localStorage.clear();
        sessionStorage.clear();
        
        // Store user data
        const userData = ${JSON.stringify(userData)};
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('👤 User data stored:', userData);
        console.log('🚀 Redirecting to:', '${dashboardUrl}');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = '${dashboardUrl}';
        }, 2000);
    </script>
</body>
</html>`
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    })
    
  } catch (error) {
    console.error('❌ Server login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
