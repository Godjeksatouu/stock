import { NextRequest, NextResponse } from 'next/server';
import { getMany } from '@/lib/database';
import { ApiResponse, Stock } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const stocks = await getMany('stocks', {}, '*', 'name');

    const response: ApiResponse<Stock[]> = {
      success: true,
      data: stocks as Stock[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Stocks fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
