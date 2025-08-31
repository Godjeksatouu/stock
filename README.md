# 📦 Stock Management System

A comprehensive stock management system built with Next.js, TypeScript, and MySQL. Features include inventory management, POS system, sales tracking, and multi-location support.

## 🚀 Features

- **Multi-Stock Management**: Support for multiple locations (Al Ouloum, Renaissance, Gros)
- **Point of Sale (POS)**: Complete cashier system with barcode scanning
- **Inventory Management**: Product management with stock tracking
- **Sales Analytics**: Comprehensive sales reporting and statistics
- **Invoice Generation**: Automatic PDF invoice generation
- **User Management**: Role-based access control (Admin, Cashier, Super Admin)
- **Real-time Updates**: Live inventory and sales updates

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Next.js API Routes
- **Database**: MySQL 8.0+
- **Authentication**: Custom JWT-based auth
- **PDF Generation**: jsPDF
- **Charts**: Recharts

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** 18.17.0 or higher
- **npm** 9.0.0 or higher
- **MySQL** 8.0 or higher
- **Git** (for cloning)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/stock-management-system.git
cd stock-management-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE stock;
```

2. Copy the environment file:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your database credentials:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stock

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Initialize Database

```bash
npm run init-db
```

This will create all necessary tables and insert sample data.

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run init-db` - Initialize database with schema and sample data
- `npm run test-db` - Test database connection

## 🏗️ Project Structure

```
stock-management-system/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── products/             # Product management
│   │   ├── sales/                # Sales management
│   │   ├── invoices/             # Invoice generation
│   │   └── statistics/           # Analytics endpoints
│   ├── dashboard/                # Dashboard pages
│   │   └── stock/                # Stock-specific pages
│   ├── login/                    # Authentication pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Reusable components
│   ├── ui/                       # UI components (buttons, forms, etc.)
│   ├── cashier-system.tsx        # POS system component
│   ├── product-management.tsx    # Product management
│   └── ...                       # Other components
├── lib/                          # Utility functions
│   ├── api.ts                    # API client
│   ├── auth.ts                   # Authentication utilities
│   ├── db.ts                     # Database connection
│   └── utils.ts                  # General utilities
├── scripts/                      # Database and utility scripts
├── public/                       # Static assets
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 👥 Default Users

After running `npm run init-db`, you can log in with these accounts:

### Super Admin
- **Email**: `superadmin@aminox.ma`
- **Password**: `SuperAdmin@2024!`
- **Access**: All stocks and admin functions

### Al Ouloum Stock
- **Admin**: `admin.alouloum@aminox.ma` / `AlOul0um@2024!`
- **Cashier**: `caisse.alouloum@aminox.ma` / `Caisse@AlOul2024`

### Renaissance Stock
- **Admin**: `admin.renaissance@aminox.ma` / `Renaiss@nce2024!`
- **Cashier**: `caisse.renaissance@aminox.ma` / `Caisse@Ren2024`

### Gros Stock
- **Admin**: `admin.gros@aminox.ma` / `Gr0s@Admin2024!`
- **Cashier**: `caisse.gros@aminox.ma` / `Caisse@Gr0s2024`

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Role-based Access**: Different permissions for different roles
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries

## 📱 Usage

### For Administrators
1. Log in with admin credentials
2. Access product management, sales reports, and user management
3. Monitor inventory levels and sales analytics

### For Cashiers
1. Log in with cashier credentials
2. Access POS system for processing sales
3. Generate invoices and manage transactions

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npm run test-db
```

### Port Already in Use
If port 3000 is busy, the app will automatically use port 3001.

### Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/stock-management-system/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🔄 Updates

To update the project:

```bash
git pull origin main
npm install
npm run build
```

---

**Built with ❤️ using Next.js and TypeScript**
