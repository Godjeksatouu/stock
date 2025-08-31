import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('👥 Updating user:', params.id);
    
    const userId = parseInt(params.id);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur invalide' },
        { status: 400 }
      );
    }

    const { username, email, password, role, stock_id } = await request.json();

    // Validation
    if (!username || !email || !role) {
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

    // Check if email/username is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?',
      [email, username, userId]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Un autre utilisateur avec cet email ou nom d\'utilisateur existe déjà' },
        { status: 409 }
      );
    }

    // Build update query
    let updateQuery = `
      UPDATE users 
      SET username = ?, email = ?, role = ?, stock_id = ?, updated_at = NOW()
    `;
    let updateValues = [
      username,
      email,
      role,
      role === 'super_admin' ? null : stock_id
    ];

    // Add password to update if provided
    if (password && password.trim() !== '') {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += ', password = ?';
      updateValues.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    updateValues.push(userId);

    const [result] = await pool.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log('✅ User updated successfully:', userId);

    return NextResponse.json({
      success: true,
      message: 'Utilisateur modifié avec succès'
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la modification de l\'utilisateur',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('👥 Deleting user:', params.id);
    
    const userId = parseInt(params.id);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur invalide' },
        { status: 400 }
      );
    }

    // Soft delete - set is_active to 0
    const [result] = await pool.query(
      'UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log('✅ User deleted successfully:', userId);

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la suppression de l\'utilisateur',
        details: error.message
      },
      { status: 500 }
    );
  }
}
