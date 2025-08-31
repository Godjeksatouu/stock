import { NextRequest, NextResponse } from 'next/server';
import { getMany, updateRecord } from '@/lib/database';
import { ApiResponse } from '@/lib/types';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT u.*, s.name as stock_name
      FROM users u
      LEFT JOIN stocks s ON u.stock_id = s.id
      WHERE u.is_active = true
      ORDER BY u.role DESC, s.name ASC, u.username ASC
    `;

    const result = await getMany(query, []);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const response: ApiResponse<any[]> = {
      success: true,
      data: result.data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, password } = body;

    if (!id || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const emailCheckResult = await getMany(
      'SELECT id FROM users WHERE email = ? AND id != ? AND is_active = true',
      [email, id]
    );

    if (emailCheckResult.success && emailCheckResult.data && emailCheckResult.data.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    const updateFields = ['email = ?'];
    const updateValues = [email];

    // If password is provided, hash it and add to update
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const result = await updateRecord(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND is_active = true`,
      updateValues
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'User updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('👥 Creating new user...');

    const { username, email, password, role, stock_id } = await request.json();

    // Validation
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }

    // Validate stock_id for non-super_admin roles
    if (role !== 'super_admin' && !stock_id) {
      return NextResponse.json(
        { success: false, error: 'Un stock doit être sélectionné pour ce rôle' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.query(`
      INSERT INTO users (username, email, password, role, stock_id, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW())
    `, [
      username,
      email,
      hashedPassword,
      role,
      role === 'super_admin' ? null : stock_id
    ]);

    console.log('✅ User created successfully:', result.insertId);

    return NextResponse.json({
      success: true,
      data: { id: result.insertId },
      message: 'Utilisateur créé avec succès'
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création de l\'utilisateur',
        details: error.message
      },
      { status: 500 }
    );
  }
}
