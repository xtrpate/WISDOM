# WISDOM Admin Panel
**Web-Based Sales and Inventory System with Digital Blueprint**
Spiral Wood Services — 8 Sitio Laot, Prenza 1, Marilao, Bulacan

---

## Tech Stack
| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, React Router v6, Zustand, Axios, Chart.js, react-konva, Three.js, jsPDF |
| Backend  | Node.js, Express.js |
| Database | MySQL (mysql2/promise) |
| Auth     | JWT (jsonwebtoken + bcryptjs) |
| Files    | Multer (image/PDF uploads) |
| PDF      | PDFKit (server), jsPDF + autoTable (client) |
| Cron     | node-cron (auto backup twice daily) |

---

## Project Structure

```
wisdom-admin/
│
├── backend/
│   ├── .env.example                  # Environment variable template
│   ├── package.json
│   ├── server.js                     # Express entry point, middleware, routes
│   │
│   ├── config/
│   │   ├── db.js                     # MySQL connection pool
│   │   └── upload.js                 # Multer configs per file type
│   │
│   ├── middleware/
│   │   ├── auth.js                   # JWT authenticate + authorize(roles)
│   │   ├── auditLog.js               # logAction() factory → audit_logs table
│   │   └── errorHandler.js           # validate() + global error handler
│   │
│   ├── controllers/
│   │   ├── authController.js         # login, getMe, updateProfile, changePassword
│   │   ├── dashboardController.js    # KPIs, charts, top products, recent orders
│   │   ├── productController.js      # Products CRUD + variations + BOM + report
│   │   ├── inventoryController.js    # Raw materials, stock movements, suppliers
│   │   ├── blueprintController.js    # Blueprints CRUD + estimation + revisions
│   │   ├── orderController.js        # Orders, accept/decline, payments, delivery
│   │   ├── salesController.js        # Sales report (POS/Online/Combined) + print
│   │   ├── managementController.js   # Warranty, contracts, customers, users
│   │   └── websiteController.js      # Settings, FAQs, static pages, backup
│   │
│   ├── routes/
│   │   └── index.js                  # All API routes mounted under /api
│   │
│   └── services/
│       ├── cronService.js            # Auto-backup at 12AM and 12PM daily
│       └── pdfService.js             # PDFKit quotation PDF generator
│
└── frontend/
    ├── package.json
    └── src/
        ├── index.js                  # React entry point (ReactDOM.createRoot)
        ├── App.jsx                   # Router + RequireAuth guard + all routes
        │
        ├── services/
        │   └── api.js                # Axios instance, auth interceptors
        │
        ├── store/
        │   └── authStore.js          # Zustand store: user, token, login/logout
        │
        ├── components/
        │   └── layout/
        │       └── AdminLayout.jsx   # Sidebar nav + topbar + role filtering
        │
        └── pages/
            ├── auth/
            │   └── LoginPage.jsx
            │
            ├── dashboard/
            │   └── DashboardPage.jsx         # KPI cards, charts, recent orders
            │
            ├── products/
            │   ├── ProductsPage.jsx          # Table, search, filter, featured toggle
            │   └── ProductFormPage.jsx       # Create/edit with variations + BOM
            │
            ├── inventory/
            │   ├── RawMaterialsPage.jsx      # Raw materials CRUD
            │   ├── BuildMaterialsPage.jsx    # Finished products + BOM panel
            │   ├── StockMovementPage.jsx     # Stock movement log + record modal
            │   └── SuppliersPage.jsx         # Suppliers CRUD
            │
            ├── blueprints/
            │   ├── BlueprintsPage.jsx        # Tabbed: My / Imports / Gallery / Archive
            │   ├── BlueprintDesign.jsx       # 2D Konva canvas + 3D Three.js viewer
            │   ├── EstimationPage.jsx        # Line items, cost summary, PDF quotation
            │   └── ContractsPage.jsx         # Generate contracts, print PDF
            │
            ├── orders/
            │   ├── OrdersPage.jsx            # Orders list, filters, quick accept/decline
            │   ├── OrderDetailPage.jsx       # Full order: items, payments, delivery
            │   └── CancellationsPage.jsx     # Cancellation requests + refund processing
            │
            ├── sales/
            │   └── SalesReportPage.jsx       # POS / Online / Combined tabs + PDF export
            │
            ├── warranty/
            │   └── WarrantyPage.jsx          # Claims list, review/approve/fulfill modal
            │
            ├── customers/
            │   └── CustomersPage.jsx         # Customer accounts, approval, activate/deactivate
            │
            ├── users/
            │   └── UsersPage.jsx             # Admin/staff management, create, reset password
            │
            ├── website/
            │   ├── WebsiteSettingsPage.jsx   # Logo, payments, email, policy settings
            │   ├── FaqsPage.jsx              # FAQ CRUD with sort order + visibility
            │   └── StaticPagesPage.jsx       # About Us / Contact / FAQ intro editor
            │
            └── backup/
                └── BackupPage.jsx            # Backup logs + manual trigger
```

---

## Quick Setup

### 1. Clone and install
```bash
# Backend
cd wisdom-admin/backend
npm install
cp .env.example .env
# Fill in .env with your DB credentials, JWT secret, mail settings

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment
Edit `backend/.env`:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wisdom_db
JWT_SECRET=your_very_long_secret
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
UPLOAD_DIR=./uploads
BACKUP_DIR=./backups
```

### 3. Set up the database
```bash
mysql -u root -p wisdom_db < wisdom_db.sql
```

### 4. Run
```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3001 for admin)
cd frontend && npm start
```

---

## API Routes Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Admin/staff login |
| GET | /api/auth/me | Current user info |
| GET | /api/dashboard | KPIs + charts |
| GET/POST | /api/products | Product list + create |
| GET/PUT/DELETE | /api/products/:id | Product detail |
| GET/POST | /api/inventory/raw | Raw materials |
| GET/POST | /api/inventory/movements | Stock movements |
| GET/POST | /api/suppliers | Suppliers |
| GET/POST | /api/blueprints | Blueprints |
| GET/PUT | /api/blueprints/:id | Blueprint detail |
| GET/POST | /api/blueprints/:id/estimation | Cost estimation |
| GET | /api/orders | Orders list |
| POST | /api/orders/:id/accept | Accept order |
| POST | /api/orders/:id/decline | Decline order |
| POST | /api/orders/:id/verify-payment | Verify payment |
| POST | /api/orders/:id/delivery-receipt | Upload receipt |
| GET | /api/orders/cancellations | Cancellation list |
| POST | /api/orders/:id/cancellation | Process cancellation |
| GET | /api/sales/report | Sales report |
| GET | /api/warranty | Warranty claims |
| PATCH | /api/warranty/:id | Update warranty status |
| GET | /api/contracts | Contracts list |
| POST | /api/contracts | Generate contract |
| GET | /api/customers | Customer list |
| PATCH | /api/customers/:id/status | Approve/reject/activate |
| GET/POST | /api/users | User list + create |
| PUT/DELETE | /api/users/:id | Edit/delete user |
| PATCH | /api/users/:id/password | Reset password |
| GET/PUT | /api/website/settings | Website settings |
| GET/POST | /api/website/faqs | FAQ management |
| GET/PUT | /api/website/pages/:slug | Static pages |
| GET | /api/backup/logs | Backup history |
| POST | /api/backup/trigger | Manual backup |

---

## Roles & Permissions
| Feature | Admin | Staff |
|---------|-------|-------|
| Dashboard | ✅ | ✅ |
| Products | ✅ | ✅ |
| Inventory | ✅ | ✅ |
| Blueprints | ✅ | ✅ |
| Orders | ✅ | ✅ |
| Sales Reports | ✅ | ✅ |
| Warranty | ✅ | ✅ |
| Contracts | ✅ | ✅ |
| Customers | ✅ | ✅ |
| Users Management | ✅ | ❌ |
| Website Settings | ✅ | ❌ |
| Backup | ✅ | ❌ |

---

## Key Business Rules
- **Warranty:** 1 year from order completion date
- **Cancellation fees:** Full refund (before shipment) / 15% fee (after down payment) / Non-refundable (after contract release) / Voided same-day POS
- **Stock status:** Auto-recalculated on every inventory write (in_stock / low_stock / out_of_stock)
- **Blueprints:** Stage-locked fields enforced server-side per stage
- **Backup:** mysqldump auto-runs at 12:00 AM and 12:00 PM daily

---

*Generated for Spiral Wood Services WISDOM System — Admin Panel (4-member group project)*
