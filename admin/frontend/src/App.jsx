// src/App.jsx – WISDOM Admin Panel root with React Router
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';

// ── Layout ────────────────────────────────────────────────────────────────────
import AdminLayout from './components/layout/AdminLayout';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage';

// ── Dashboard ─────────────────────────────────────────────────────────────────
import DashboardPage from './pages/dashboard/DashboardPage';

// ── Products & Inventory ──────────────────────────────────────────────────────
import ProductsPage      from './pages/products/ProductsPage';
import ProductFormPage   from './pages/products/ProductFormPage';
import RawMaterialsPage  from './pages/inventory/RawMaterialsPage';
import BuildMaterialsPage from './pages/inventory/BuildMaterialsPage';
import StockMovementPage from './pages/inventory/StockMovementPage';
import SuppliersPage     from './pages/inventory/SuppliersPage';

// ── Blueprints ────────────────────────────────────────────────────────────────
import BlueprintsPage    from './pages/blueprints/BlueprintsPage';
import BlueprintDesign   from './pages/blueprints/BlueprintDesign';
import EstimationPage    from './pages/blueprints/EstimationPage';
import ContractsPage     from './pages/blueprints/ContractsPage';

// ── Orders ─────────────────────────────────────────────────────────────────────
import OrdersPage        from './pages/orders/OrdersPage';
import OrderDetailPage   from './pages/orders/OrderDetailPage';
import CancellationsPage from './pages/orders/CancellationsPage';

// ── Sales ─────────────────────────────────────────────────────────────────────
import SalesReportPage   from './pages/sales/SalesReportPage';

// ── Warranty ──────────────────────────────────────────────────────────────────
import WarrantyPage      from './pages/warranty/WarrantyPage';

// ── Management ────────────────────────────────────────────────────────────────
import CustomersPage     from './pages/customers/CustomersPage';
import UsersPage         from './pages/users/UsersPage';

// ── Website ───────────────────────────────────────────────────────────────────
import WebsiteSettingsPage from './pages/website/WebsiteSettingsPage';
import FaqsPage            from './pages/website/FaqsPage';
import StaticPagesPage     from './pages/website/StaticPagesPage';

// ── Backup ────────────────────────────────────────────────────────────────────
import BackupPage        from './pages/backup/BackupPage';

// ── Auth Guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children, roles }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Panel – requires auth */}
        <Route path="/" element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Products */}
          <Route path="products"         element={<ProductsPage />} />
          <Route path="products/new"     element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />

          {/* Inventory */}
          <Route path="inventory/raw"         element={<RawMaterialsPage />} />
          <Route path="inventory/build"       element={<BuildMaterialsPage />} />
          <Route path="inventory/movements"   element={<StockMovementPage />} />
          <Route path="inventory/suppliers"   element={<SuppliersPage />} />

          {/* Blueprints */}
          <Route path="blueprints"            element={<BlueprintsPage />} />
          <Route path="blueprints/:id/design" element={<BlueprintDesign />} />
          <Route path="blueprints/:id/estimation" element={<EstimationPage />} />
          <Route path="contracts"             element={<ContractsPage />} />

          {/* Orders */}
          <Route path="orders"                element={<OrdersPage />} />
          <Route path="orders/:id"            element={<OrderDetailPage />} />
          <Route path="orders/cancellations"  element={<CancellationsPage />} />

          {/* Sales */}
          <Route path="sales"                 element={<SalesReportPage />} />

          {/* Warranty */}
          <Route path="warranty"              element={<WarrantyPage />} />

          {/* Management – admin only */}
          <Route path="customers" element={
            <RequireAuth roles={['admin']}>
              <CustomersPage />
            </RequireAuth>
          } />
          <Route path="users" element={
            <RequireAuth roles={['admin']}>
              <UsersPage />
            </RequireAuth>
          } />

          {/* Website Maintenance – admin only */}
          <Route path="website/settings" element={
            <RequireAuth roles={['admin']}>
              <WebsiteSettingsPage />
            </RequireAuth>
          } />
          <Route path="website/faqs" element={
            <RequireAuth roles={['admin']}>
              <FaqsPage />
            </RequireAuth>
          } />
          <Route path="website/pages" element={
            <RequireAuth roles={['admin']}>
              <StaticPagesPage />
            </RequireAuth>
          } />

          {/* Backup – admin only */}
          <Route path="backup" element={
            <RequireAuth roles={['admin']}>
              <BackupPage />
            </RequireAuth>
          } />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
