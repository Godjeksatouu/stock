import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('🔐 Frontend auth call:', { email, endpoint: '/auth/login', timestamp: new Date().toISOString() });

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    // Query user from database
    const query = 'SELECT id, email, username, password, role, stock_id FROM users WHERE email = ? AND is_active = 1';
    console.log('🗄️ Database query for:', email);
    
    const [users] = await pool.execute(query, [email]);

    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ User not found:', email);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    const user = users[0] as any;
    console.log('👤 Found user:', { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      stock_id: user.stock_id,
      password_length: user.password ? user.password.length : 0
    });

    // Check password (handle both plain text and bcrypt)
    let isValidPassword = false;
    
    if (user.password && user.password.startsWith('$2b$')) {
      console.log('⚠️ Bcrypt password detected - this endpoint expects plain text');
      return NextResponse.json({ 
        success: false, 
        error: 'Please use the main login page for bcrypt passwords'
      }, { status: 401 });
    } else {
      // Plain text comparison
      isValidPassword = password === user.password;
      console.log('🔑 Password check:', { 
        provided: password, 
        stored: user.password, 
        match: isValidPassword 
      });
    }

    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    console.log('✅ Login successful for:', { email: user.email, role: user.role });

    // Return user data (without password)
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      stockId: user.stock_id
    };

    return NextResponse.json({
      success: true,
      data: userData,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ Auth endpoint error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  try {
    const [result] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    return NextResponse.json({
      success: true,
      message: 'Frontend auth endpoint working',
      active_users: (result as any[])[0].count,
      endpoint: '/auth/login',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
