import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // For now, we'll just return success since we're using localStorage for session management
    // In a production app, you might want to invalidate server-side sessions or JWT tokens
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'Logged out successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
