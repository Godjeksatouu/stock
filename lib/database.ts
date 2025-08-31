import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stock',
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
