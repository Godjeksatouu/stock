import { NextRequest, NextResponse } from 'next/server';
import { getOne } from '@/lib/database';
import { ApiResponse, LoginResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const userResult = await getOne(
      'SELECT * FROM users WHERE id = ? AND is_active = true',
      [userId]
    );

    if (!userResult.success || !userResult.data) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const user = userResult.data;

    // Return user data (excluding password)
    const responseData: LoginResponse = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        stock_id: user.stock_id,
      },
    };

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: responseData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
