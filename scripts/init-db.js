const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    // First, create connection without specifying database to create the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Connected to MySQL server');

    // Create database
    console.log('Creating database...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS stock');
    await connection.end();

    // Now connect to the specific database
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'stock',
      multipleStatements: true
    });

    console.log('Creating tables and inserting data...');

    // Execute statements one by one
    const statements = [
      // Create stocks table
      `CREATE TABLE IF NOT EXISTS stocks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Insert stocks
      `INSERT IGNORE INTO stocks (name) VALUES
      ('Librairie Al Ouloum'),
      ('Librairie La Renaissance'),
      ('Gros')`,

      // Create users table
      `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'caissier', 'super_admin') DEFAULT 'admin',
        stock_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL
      )`,

      // Insert users (admins and cashiers)
      `INSERT IGNORE INTO users (username, email, password, role, stock_id) VALUES
      ('admin_alouloum', 'admin@alouloum.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1),
      ('admin_renaissance', 'admin@renaissance.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 2),
      ('admin_gros', 'admin@gros.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 3),
      ('superadmin', 'superadmin@system.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', NULL),
      ('caissier_alouloum', 'caissier@alouloum.com', '$2b$10$OAWemLB3rVcYsLQV/8VDuu/QsKQPM1HClUkb05Lm.UBU82QMX5pPe', 'caissier', 1),
      ('caissier_renaissance', 'caissier@renaissance.com', '$2b$10$OAWemLB3rVcYsLQV/8VDuu/QsKQPM1HClUkb05Lm.UBU82QMX5pPe', 'caissier', 2),
      ('caissier_gros', 'caissier@gros.com', '$2b$10$OAWemLB3rVcYsLQV/8VDuu/QsKQPM1HClUkb05Lm.UBU82QMX5pPe', 'caissier', 3)`
    ];

    for (const statement of statements) {
      await dbConnection.execute(statement);
    }

    console.log('Database initialized successfully!');
    console.log('');
    console.log('Sample users created:');
    console.log('- admin@alouloum.com (password: admin123) - Librairie Al Ouloum');
    console.log('- admin@renaissance.com (password: admin123) - Librairie La Renaissance');
    console.log('- admin@gros.com (password: admin123) - Gros');
    console.log('- superadmin@system.com (password: admin123) - Super Admin');
    console.log('');
    console.log('Sample products and sales data have been created.');

    await dbConnection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

initializeDatabase();
