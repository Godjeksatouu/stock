# 📁 Project Structure

This document provides a comprehensive overview of the Stock Management System project structure.

## 🏗️ Root Directory

```
stock-management-system/
├── 📁 app/                     # Next.js App Router (main application)
├── 📁 components/              # Reusable React components
├── 📁 lib/                     # Utility functions and configurations
├── 📁 public/                  # Static assets
├── 📁 scripts/                 # Database and utility scripts
├── 📄 .env.example             # Environment variables template
├── 📄 .gitignore               # Git ignore rules
├── 📄 CONTRIBUTING.md          # Contribution guidelines
├── 📄 LICENSE                  # MIT License
├── 📄 README.md                # Project documentation
├── 📄 next.config.js           # Next.js configuration
├── 📄 package.json             # Dependencies and scripts
├── 📄 postcss.config.js        # PostCSS configuration
├── 📄 tailwind.config.js       # Tailwind CSS configuration
└── 📄 tsconfig.json            # TypeScript configuration
```

## 📱 App Directory (`/app`)

Next.js App Router structure with API routes and pages:

```
app/
├── 📁 api/                     # API endpoints
│   ├── 📁 auth/                # Authentication
│   │   └── 📁 login/           # Login endpoint
│   ├── 📁 invoices/            # Invoice management
│   ├── 📁 products/            # Product management
│   ├── 📁 sales/               # Sales management
│   │   └── 📁 [id]/            # Dynamic sale routes
│   │       └── 📁 barcode/     # Barcode operations
│   ├── 📁 statistics/          # Analytics endpoints
│   └── 📁 users/               # User management
├── 📁 dashboard/               # Dashboard pages
│   └── 📁 stock/               # Stock-specific pages
│       └── 📁 [stockId]/       # Dynamic stock routes
│           ├── 📁 cashier/     # POS system
│           ├── 📁 factures-caisse/ # Invoice history
│           ├── 📁 products/    # Product management
│           └── 📁 sales/       # Sales management
├── 📁 login/                   # Authentication pages
├── 📄 favicon.ico              # Favicon
├── 📄 globals.css              # Global styles
├── 📄 layout.tsx               # Root layout
├── 📄 loading.tsx              # Loading component
├── 📄 not-found.tsx            # 404 page
└── 📄 page.tsx                 # Home page
```

## 🧩 Components Directory (`/components`)

Reusable React components organized by functionality:

```
components/
├── 📁 ui/                      # Base UI components
│   ├── 📄 accordion.tsx        # Accordion component
│   ├── 📄 alert-dialog.tsx     # Alert dialog
│   ├── 📄 avatar.tsx           # Avatar component
│   ├── 📄 badge.tsx            # Badge component
│   ├── 📄 button.tsx           # Button component
│   ├── 📄 card.tsx             # Card component
│   ├── 📄 checkbox.tsx         # Checkbox component
│   ├── 📄 dialog.tsx           # Dialog component
│   ├── 📄 dropdown-menu.tsx    # Dropdown menu
│   ├── 📄 form.tsx             # Form components
│   ├── 📄 input.tsx            # Input component
│   ├── 📄 label.tsx            # Label component
│   ├── 📄 popover.tsx          # Popover component
│   ├── 📄 select.tsx           # Select component
│   ├── 📄 separator.tsx        # Separator component
│   ├── 📄 sheet.tsx            # Sheet component
│   ├── 📄 table.tsx            # Table component
│   ├── 📄 tabs.tsx             # Tabs component
│   ├── 📄 textarea.tsx         # Textarea component
│   └── 📄 toast.tsx            # Toast notifications
├── 📄 cashier-system.tsx       # POS system component
├── 📄 factures-caisse-management.tsx # Invoice management
├── 📄 hydration-safe.tsx       # Hydration safety wrapper
├── 📄 product-management.tsx   # Product management
├── 📄 sales-management.tsx     # Sales management
└── 📄 stock-selector.tsx       # Stock selection component
```

## 🛠️ Lib Directory (`/lib`)

Utility functions, configurations, and shared logic:

```
lib/
├── 📄 api.ts                   # API client and utilities
├── 📄 auth.ts                  # Authentication utilities
├── 📄 db.ts                    # Database connection
└── 📄 utils.ts                 # General utility functions
```

## 🎨 Public Directory (`/public`)

Static assets served directly:

```
public/
├── 📄 favicon.ico              # Website favicon
├── 📄 logo.png                 # Application logo
└── 📁 images/                  # Image assets
```

## 🔧 Scripts Directory (`/scripts`)

Database initialization and utility scripts:

```
scripts/
├── 📄 init-db.js               # Database initialization
├── 📄 test-connection.js       # Database connection test
└── 📄 [other-scripts].js       # Additional utility scripts
```

## 📋 Configuration Files

### Package.json
- **Dependencies**: All required npm packages
- **Scripts**: Development and build commands
- **Engines**: Node.js and npm version requirements

### TypeScript Configuration (tsconfig.json)
- **Compiler options**: TypeScript compilation settings
- **Path mapping**: Import path aliases
- **Include/Exclude**: File inclusion rules

### Tailwind Configuration (tailwind.config.js)
- **Content paths**: Files to scan for classes
- **Theme customization**: Colors, fonts, spacing
- **Plugins**: Additional Tailwind plugins

### Next.js Configuration (next.config.js)
- **Build settings**: Optimization and build options
- **Environment variables**: Public environment variables
- **Redirects/Rewrites**: URL routing rules

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and authentication
- **stocks**: Store/warehouse locations
- **products**: Product catalog
- **barcodes**: Product barcode associations
- **sales**: Sales transactions
- **sale_items**: Individual sale line items
- **invoices**: Invoice records
- **clients**: Customer information

### Relationships
- Users belong to stocks (many-to-one)
- Products belong to stocks (many-to-one)
- Sales have multiple sale items (one-to-many)
- Invoices reference sales (one-to-one)

## 🔐 Security Considerations

### Authentication
- **Password hashing**: bcrypt with salt rounds
- **JWT tokens**: Secure token-based authentication
- **Role-based access**: Different permissions per role

### Database Security
- **Parameterized queries**: SQL injection prevention
- **Input validation**: Comprehensive data validation
- **Connection pooling**: Secure database connections

## 🚀 Deployment Structure

### Development
```bash
npm run dev          # Start development server
npm run test-db      # Test database connection
npm run init-db      # Initialize database
```

### Production
```bash
npm run build        # Build for production
npm start            # Start production server
```

## 📊 Data Flow

### Authentication Flow
1. User submits credentials
2. Server validates against database
3. JWT token generated and returned
4. Token used for subsequent requests

### Sales Flow
1. Cashier adds products to cart
2. Sale created in database
3. Sale items recorded
4. Invoice generated
5. PDF created and stored

### Product Management Flow
1. Admin adds/updates products
2. Barcode associations created
3. Stock levels updated
4. Changes reflected across system

## 🔄 State Management

### Client State
- **React hooks**: useState, useEffect for local state
- **Context API**: Global state for authentication
- **Local storage**: Persistent client-side data

### Server State
- **Database**: MySQL for persistent data
- **API routes**: RESTful endpoints for data operations
- **Caching**: Optimized queries and response caching

This structure provides a scalable, maintainable foundation for the Stock Management System with clear separation of concerns and modern development practices.
