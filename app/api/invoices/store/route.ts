import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { sale_id, filename, pdf_base64 } = await request.json()

    if (!sale_id || !pdf_base64) {
      return NextResponse.json(
        { success: false, error: 'sale_id and pdf_base64 are required' },
        { status: 400 }
      )
    }

    // Ensure table exists (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_files (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sale_id INT NOT NULL UNIQUE,
        filename VARCHAR(255),
        file_data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    const buffer = Buffer.from(pdf_base64, 'base64')

    // Insert or update
    await pool.query(
      `INSERT INTO invoice_files (sale_id, filename, file_data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE filename = VALUES(filename), file_data = VALUES(file_data)`,
      [sale_id, filename || null, buffer]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Error storing invoice file:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

