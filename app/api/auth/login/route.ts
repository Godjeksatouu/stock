import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    console.log('🔐 Login attempt:', { email });

    // Query to get user data with stock name and password - role is stored directly in users table
    const query = `
      SELECT u.id, u.username, u.email, u.password, u.role, u.stock_id, s.name as stock_name
      FROM users u
      LEFT JOIN stocks s ON u.stock_id = s.id
      WHERE u.email = ? AND u.is_active = 1
    `;

    const [rows] = await pool.query(query, [email]);
    const users = Array.isArray(rows) ? rows : [];

    if (users.length === 0) {
      console.log('❌ User not found:', email);
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé ou inactif' },
        { status: 401 }
      );
    }

    const user = users[0] as any;
    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      stock_id: user.stock_id
    });

    // Password verification - handle both bcrypt and plain text
    let isValidPassword = false;

    if (user.password) {
      if (user.password.startsWith('$2b$')) {
        // Bcrypt password
        isValidPassword = await bcrypt.compare(password, user.password);
        console.log('🔑 Bcrypt password verification:', { isValid: isValidPassword });
      } else {
        // Plain text password (for demo accounts)
        isValidPassword = password === user.password;
        console.log('🔑 Plain text password verification:', { isValid: isValidPassword });
      }
    }

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Prepare user session data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role, // Use role from users table
      stock_id: user.stock_id,
      stock_name: user.stock_name
    };

    console.log('✅ Login successful:', userData);

    return NextResponse.json({
      success: true,
      data: { user: userData },
      message: 'Connexion réussie'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
