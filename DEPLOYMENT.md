# 🚀 Deployment Guide

This guide covers different deployment options for the Stock Management System.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js** 18.17.0 or higher
- **MySQL** 8.0 or higher
- **Domain name** (for production)
- **SSL certificate** (recommended for production)

## 🏠 Local Development

### Quick Start
```bash
git clone https://github.com/your-username/stock-management-system.git
cd stock-management-system
npm install
cp .env.example .env.local
# Configure .env.local with your database credentials
npm run init-db
npm run dev
```

Access at: `http://localhost:3000`

## 🌐 Production Deployment

### Option 1: Traditional VPS/Server

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

#### 2. Application Setup
```bash
# Clone repository
git clone https://github.com/your-username/stock-management-system.git
cd stock-management-system

# Install dependencies
npm install

# Build application
npm run build

# Configure environment
cp .env.example .env.local
# Edit .env.local with production values
```

#### 3. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE stock;
exit

# Initialize database
npm run init-db
```

#### 4. Start Application
```bash
# Start with PM2
pm2 start npm --name "stock-management" -- start
pm2 save
pm2 startup
```

#### 5. Nginx Configuration (Optional)
```nginx
# /etc/nginx/sites-available/stock-management
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/stock-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=your_password
      - DB_NAME=stock
      - JWT_SECRET=your_jwt_secret
    depends_on:
      - mysql
    volumes:
      - ./uploads:/app/uploads

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=your_password
      - MYSQL_DATABASE=stock
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  mysql_data:
```

#### 3. Deploy with Docker
```bash
# Build and start
docker-compose up -d

# Initialize database (if needed)
docker-compose exec app npm run init-db
```

### Option 3: Cloud Deployment (Vercel)

#### 1. Prepare for Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

#### 2. Configure vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "DB_HOST": "@db_host",
    "DB_PORT": "@db_port",
    "DB_USER": "@db_user",
    "DB_PASSWORD": "@db_password",
    "DB_NAME": "@db_name",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

#### 3. Deploy
```bash
# Deploy to Vercel
vercel

# Set environment variables
vercel env add DB_HOST
vercel env add DB_PASSWORD
# ... add other variables

# Deploy production
vercel --prod
```

**Note**: You'll need a separate MySQL database (like PlanetScale, AWS RDS, or DigitalOcean Managed Database) for Vercel deployment.

## 🔧 Environment Configuration

### Production Environment Variables
```env
# Database
DB_HOST=your_production_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=stock

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your_very_secure_jwt_secret_key

# Optional: Email (for notifications)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
```

## 🔒 Security Checklist

### Before Going Live
- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable error logging
- [ ] Configure rate limiting
- [ ] Review user permissions
- [ ] Test all authentication flows
- [ ] Verify data validation

### Database Security
```sql
-- Create dedicated database user
CREATE USER 'stock_app'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON stock.* TO 'stock_app'@'%';
FLUSH PRIVILEGES;
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check application status
curl http://your-domain.com/api/health

# Check database connection
npm run test-db

# Monitor with PM2
pm2 status
pm2 logs stock-management
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p stock > backup_stock_$DATE.sql
```

### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/stock-management
```

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart application
pm2 restart stock-management
```

### Database Migrations
```bash
# Run any new migrations
npm run migrate

# Or manually apply schema changes
mysql -u root -p stock < migration.sql
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
sudo lsof -i :3000
# Kill process
sudo kill -9 PID
```

#### Database Connection Failed
```bash
# Check MySQL status
sudo systemctl status mysql
# Restart MySQL
sudo systemctl restart mysql
```

#### Permission Denied
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/app
chmod -R 755 /path/to/app
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_products_stock_id ON products(stock_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
```

#### Application Optimization
```bash
# Enable gzip compression in Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Configure caching headers
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📞 Support

For deployment issues:
1. Check the logs: `pm2 logs stock-management`
2. Verify environment variables
3. Test database connection: `npm run test-db`
4. Check firewall and port settings
5. Review Nginx configuration (if used)

Remember to always test deployments in a staging environment before going to production!
