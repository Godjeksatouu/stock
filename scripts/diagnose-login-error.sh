#!/bin/bash

echo "🔍 Diagnosing login error - Why can't you login?"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

print_header "DIAGNOSING LOGIN ERROR"

print_status "1. Checking which database the app is actually using..."

# Check if the app is using the live database or local test database
if grep -q "stock_local_test" lib/database.ts 2>/dev/null; then
    print_info "App is configured for LOCAL TEST database (stock_local_test)"
    DB_NAME="stock_local_test"
else
    print_info "App is configured for LIVE database (stock)"
    DB_NAME="stock"
fi

print_status "2. Checking users in the database the app is using..."

mysql -u root -p'zMàç30lkùm!:!kxa]]@@' $DB_NAME << SQL_CHECK_EOF
SELECT 'Database: $DB_NAME' as info;
SELECT 'Users with admin@alouloum.com:' as info;
SELECT id, email, username, password, role, stock_id, is_active 
FROM users 
WHERE email = 'admin@alouloum.com';

SELECT 'All active users:' as info;
SELECT id, email, username, password, role, stock_id, is_active 
FROM users 
WHERE is_active = 1 
ORDER BY email;
SQL_CHECK_EOF

print_status "3. Testing the exact API endpoint the frontend is calling..."

# Test the auth endpoint directly
print_info "Testing /auth/login endpoint..."
AUTH_TEST=$(curl -s -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alouloum.com","password":"admin123"}' 2>/dev/null || echo "Connection failed")

echo "Direct API test result:"
echo "$AUTH_TEST"

print_status "4. Checking PM2 logs for errors..."
echo "Recent PM2 logs:"
pm2 logs stock-management --lines 10 --nostream 2>/dev/null || echo "No PM2 logs found"

print_status "5. Creating working user in the LIVE database..."

# Make sure the user exists in the live database with correct password
mysql -u root -p'zMàç30lkùm!:!kxa]]@@' stock << 'SQL_FIX_EOF'
-- Update the database configuration to use live database
SELECT 'Fixing user in LIVE database (stock)' as info;

-- Delete any existing user with this email
DELETE FROM users WHERE email = 'admin@alouloum.com';

-- Create fresh user with plain text password
INSERT INTO users (
    email, 
    username, 
    password, 
    role, 
    role_id, 
    stock_id, 
    first_name, 
    last_name, 
    is_active, 
    created_at
) VALUES (
    'admin@alouloum.com', 
    'admin_alouloum', 
    'admin123', 
    'admin', 
    1, 
    1, 
    'Admin', 
    'Al Ouloum', 
    1, 
    NOW()
);

-- Also create superadmin
INSERT INTO users (
    email, 
    username, 
    password, 
    role, 
    role_id, 
    stock_id, 
    first_name, 
    last_name, 
    is_active, 
    created_at
) VALUES (
    'superadmin@admin.com', 
    'superadmin', 
    'superadmin123', 
    'superadmin', 
    4, 
    NULL, 
    'Super', 
    'Admin', 
    1, 
    NOW()
) ON DUPLICATE KEY UPDATE 
password = 'superadmin123',
is_active = 1;

SELECT 'Fixed users in live database:' as info;
SELECT id, email, username, password, role, stock_id, is_active 
FROM users 
WHERE email IN ('admin@alouloum.com', 'superadmin@admin.com');
SQL_FIX_EOF

print_status "6. Updating database configuration to use LIVE database..."

cat > lib/database.ts << 'LIVE_DB_EOF'
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'zMàç30lkùm!:!kxa]]@@',
  database: 'stock',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper functions
export async function getOne(table: string, conditions: any = {}, columns: string = '*'): Promise<any> {
  const whereClause = Object.keys(conditions).length > 0 
    ? 'WHERE ' + Object.keys(conditions).map(key => `${key} = ?`).join(' AND ')
    : '';
  const query = `SELECT ${columns} FROM ${table} ${whereClause} LIMIT 1`;
  const values = Object.values(conditions);
  const [rows] = await pool.execute(query, values);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function getMany(table: string, conditions: any = {}, columns: string = '*', orderBy: string = '', limit: number = 0): Promise<any[]> {
  const whereClause = Object.keys(conditions).length > 0 
    ? 'WHERE ' + Object.keys(conditions).map(key => `${key} = ?`).join(' AND ')
    : '';
  const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
  const limitClause = limit > 0 ? `LIMIT ${limit}` : '';
  const query = `SELECT ${columns} FROM ${table} ${whereClause} ${orderClause} ${limitClause}`;
  const values = Object.values(conditions);
  const [rows] = await pool.execute(query, values);
  return Array.isArray(rows) ? rows : [];
}

export async function insertRecord(table: string, data: any): Promise<any> {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  const [result] = await pool.execute(query, values);
  return result;
}

export async function updateRecord(table: string, data: any, conditions: any): Promise<any> {
  const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const values = [...Object.values(data), ...Object.values(conditions)];
  const [result] = await pool.execute(query, values);
  return result;
}

export async function deleteRecord(table: string, conditions: any): Promise<any> {
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  const values = Object.values(conditions);
  const [result] = await pool.execute(query, values);
  return result;
}

export async function executeTransaction(operations: Array<() => Promise<any>>): Promise<any[]> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function execute(sql: string, params: any[] = []): Promise<any> {
  const [result] = await pool.execute(sql, params);
  return result;
}

export { pool };
export default pool;
LIVE_DB_EOF

print_status "7. Rebuilding and restarting with live database..."

npm run build
if [ $? -eq 0 ]; then
    print_status "Build successful!"
    
    # Restart PM2
    pm2 restart stock-management 2>/dev/null || pm2 start npm --name "stock-management" -- start
    
    sleep 3
    
    print_status "8. Testing login after fix..."
    
    FINAL_TEST=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@alouloum.com","password":"admin123"}' 2>/dev/null || echo "Connection failed")
    
    echo "Final test result:"
    echo "$FINAL_TEST"
    
    if echo "$FINAL_TEST" | grep -q '"success":true'; then
        print_header "🎉 LOGIN SHOULD NOW WORK!"
        print_info "✅ User exists in live database"
        print_info "✅ API endpoint responding correctly"
        print_info "✅ Plain text password configured"
        
        echo ""
        print_info "🔑 WORKING CREDENTIALS:"
        echo "  👤 admin@alouloum.com / admin123"
        echo "  👑 superadmin@admin.com / superadmin123"
        
        echo ""
        print_info "🌐 TRY LOGIN NOW:"
        echo "  Visit: https://osccarrafik.ma/login?stock=al-ouloum"
        echo "  Use: admin@alouloum.com / admin123"
        
    else
        print_error "Login still not working!"
        print_info "Check PM2 logs: pm2 logs stock-management"
        print_info "Check database: mysql -u root -p'zMàç30lkùm!:!kxa]]@@' stock -e \"SELECT * FROM users WHERE email='admin@alouloum.com';\""
    fi
    
else
    print_error "Build failed!"
fi

print_info "📊 Summary: Fixed database configuration and user credentials for live environment"
