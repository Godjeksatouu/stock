const mysql = require('mysql2/promise');

async function addUserTrackingColumns() {
  let conn;
  try {
    console.log('🔄 Adding user tracking columns to stock_movements...');
    
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'stock'
    });
    
    console.log('✅ Connected to database');
    
    // Check current structure
    const [cols] = await conn.query('DESCRIBE stock_movements');
    const existingColumns = cols.map(c => c.Field);
    console.log('📋 Current columns:', existingColumns);
    
    // Add confirmed_by_user_id if not exists
    if (!existingColumns.includes('confirmed_by_user_id')) {
      await conn.query('ALTER TABLE stock_movements ADD COLUMN confirmed_by_user_id INT NULL');
      console.log('✅ Added confirmed_by_user_id column');
    } else {
      console.log('✅ confirmed_by_user_id column already exists');
    }
    
    // Add claimed_by_user_id if not exists
    if (!existingColumns.includes('claimed_by_user_id')) {
      await conn.query('ALTER TABLE stock_movements ADD COLUMN claimed_by_user_id INT NULL');
      console.log('✅ Added claimed_by_user_id column');
    } else {
      console.log('✅ claimed_by_user_id column already exists');
    }
    
    // Show updated structure
    const [newCols] = await conn.query('DESCRIBE stock_movements');
    console.log('📋 Updated stock_movements structure:');
    console.table(newCols.map(c => ({ 
      Field: c.Field, 
      Type: c.Type, 
      Null: c.Null, 
      Key: c.Key,
      Default: c.Default
    })));
    
    console.log('🎉 User tracking columns added successfully!');
    console.log('✅ Now tracking who confirms and claims movements');
    
  } catch (err) {
    console.error('❌ Error adding user tracking columns:', err.message);
    console.error('Full error:', err);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔌 Connection closed');
    }
  }
}

addUserTrackingColumns();
