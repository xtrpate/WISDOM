// src/App.jsx – WISDOM Admin Panel root with React Router
import React from "react";
import axios from "axios";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/authStore";
import ErrorBoundary from "./components/ErrorBoundary";
import TasksPage from "./pages/tasks/TasksPage";
import ImportPage from "./pages/blueprints/importPage";

// ── Layout ────────────────────────────────────────────────────────────────────
import AdminLayout from "./components/layout/AdminLayout";

// ── Dashboard ─────────────────────────────────────────────────────────────────
import DashboardPage from "./pages/dashboard/DashboardPage";

// ── Products & Inventory ──────────────────────────────────────────────────────
import ProductsPage from "./pages/products/ProductsPage";
import ProductFormPage from "./pages/products/ProductFormPage";
import RawMaterialsPage from "./pages/inventory/RawMaterialsPage";
import BuildMaterialsPage from "./pages/inventory/BuildMaterialsPage";
import StockMovementPage from "./pages/inventory/StockMovementPage";
import SuppliersPage from "./pages/inventory/SuppliersPage";

// ── Blueprints ────────────────────────────────────────────────────────────────
import BlueprintsPage from "./pages/blueprints/BlueprintsPage";
import BlueprintDesign from "./pages/blueprints/blueprintDesign.jsx";
import EstimationPage from "./pages/blueprints/EstimationPage";
import ContractsPage from "./pages/blueprints/ContractsPage";

// ── Orders ─────────────────────────────────────────────────────────────────────
import OrdersPage from "./pages/orders/OrdersPage";
import OrderDetailPage from "./pages/orders/OrderDetailPage";
import CancellationsPage from "./pages/orders/CancellationsPage";

// ── Sales ─────────────────────────────────────────────────────────────────────
import SalesReportPage from "./pages/sales/SalesReportPage";

// ── Warranty ──────────────────────────────────────────────────────────────────
import WarrantyPage from "./pages/warranty/WarrantyPage";

// ── Management ────────────────────────────────────────────────────────────────
import CustomersPage from "./pages/customers/CustomersPage";
import UsersPage from "./pages/users/UsersPage";

// ── Website ───────────────────────────────────────────────────────────────────
import WebsiteSettingsPage from "./pages/website/WebsiteSettingsPage";
import FaqsPage from "./pages/website/FaqsPage";
import StaticPagesPage from "./pages/website/StaticPagesPage";

// ── Backup ────────────────────────────────────────────────────────────────────
import BackupPage from "./pages/backup/BackupPage";

// ══════════════════════════════════════════════════════════════════════════════
// ── Customer Imports ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
import { CartProvider } from "./pages/customer/cartcontext";
import { CustomCartProvider } from "./pages/customer/customcartcontext";
import CustomerLayout from "./pages/customer/customerlayout.jsx";
import CustomerLoginPage from "./pages/customer/loginpage";
import RegisterPage from "./pages/customer/registerpage";
import ForgotPasswordPage from "./pages/customer/forgotpasswordpage";
import ProductCatalog from "./pages/customer/productcatalog";
import CartPage from "./pages/customer/cartpage";
import CheckoutPage from "./pages/customer/checkoutpage";
import CustomizePage from "./pages/customer/customizepage";
import CustomCartPage from "./pages/customer/customcartpage";
import CustomCheckoutPage from "./pages/customer/customcheckoutpage";
import AppointmentPage from "./pages/customer/appointmentpage";
import OrdersPageCustomer from "./pages/customer/orderspage";
import WarrantyPageCustomer from "./pages/customer/warrantypage";
import ProfileSettings from "./pages/customer/profilesettings";
import LandingPage from "./pages/customer/LandingPage";

// ══════════════════════════════════════════════════════════════════════════════
// ── Staff Imports ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
import POSLayout from "./pages/staff/POSLayout.jsx";
import POSDashboard from "./pages/staff/Dashboard";
import POSProductSearch from "./pages/staff/ProductSearch";
import POSProcessOrder from "./pages/staff/ProcessOrder";
import POSDeliveryScheduling from "./pages/staff/DeliveryScheduling";
import POSDeliveryManagement from "./pages/staff/DeliveryManagement";
import POSAppointmentScheduling from "./pages/staff/AppointmentScheduling";
import POSReceiptPage from "./pages/staff/ReceiptPage";
import POSSalesReports from "./pages/staff/SalesReports";
import POSBlueprintView from "./pages/staff/BlueprintView";
import POSInventoryLookup from "./pages/staff/InventoryLookup";

window.addEventListener("error", (e) => {
  if (
    e.message === "ResizeObserver loop limit exceeded" ||
    e.message ===
      "ResizeObserver loop completed with undelivered notifications."
  ) {
    e.stopImmediatePropagation();
  }
});

axios.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("wisdom_token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth Guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children, roles }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* ══════════════════════════════════════════════════════════════════
              CUSTOMER PORTAL
          ══════════════════════════════════════════════════════════════════ */}
          <Route element={<Outlet />}>
            {/* Standalone Pages (No Navbar) */}
            <Route path="login" element={<CustomerLoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />

            {/* Pages with Navbar */}
            <Route
              path="/"
              element={
                <CartProvider>
                  <CustomCartProvider>
                    <CustomerLayout />
                  </CustomCartProvider>
                </CartProvider>
              }
            >
              <Route index element={<LandingPage />} />
              <Route index element={<Navigate to="catalog" replace />} />
              <Route path="catalog" element={<ProductCatalog />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="customize" element={<CustomizePage />} />
              <Route path="custom-cart" element={<CustomCartPage />} />
              <Route path="custom-checkout" element={<CustomCheckoutPage />} />
              <Route path="appointment" element={<AppointmentPage />} />
              <Route path="orders" element={<OrdersPageCustomer />} />
              <Route path="warranty" element={<WarrantyPageCustomer />} />
              <Route path="profilesettings" element={<ProfileSettings />} />
            </Route>
          </Route>
          {/* ══════════════════════════════════════════════════════════════════
              ADMIN & STAFF PUBLIC ROUTES
          ══════════════════════════════════════════════════════════════════ */}

          <Route path="/admin/blueprints/:id/import" element={<ImportPage />} />

          {/* ══════════════════════════════════════════════════════════════════
              ADMIN PORTAL
          ══════════════════════════════════════════════════════════════════ */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route path="tasks" element={<TasksPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Products */}
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />

            {/* Inventory */}
            <Route path="inventory/raw" element={<RawMaterialsPage />} />
            <Route path="inventory/build" element={<BuildMaterialsPage />} />
            <Route path="inventory/movements" element={<StockMovementPage />} />
            <Route path="inventory/suppliers" element={<SuppliersPage />} />

            {/* Blueprints */}
            <Route path="blueprints" element={<BlueprintsPage />} />
            <Route path="blueprints/:id/design" element={<BlueprintDesign />} />
            <Route
              path="blueprints/:id/estimation"
              element={<EstimationPage />}
            />
            <Route path="contracts" element={<ContractsPage />} />

            {/* Orders */}
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route
              path="orders/cancellations"
              element={<CancellationsPage />}
            />

            {/* Sales */}
            <Route path="sales" element={<SalesReportPage />} />

            {/* Warranty */}
            <Route path="warranty" element={<WarrantyPage />} />

            {/* Management – admin only */}
            <Route
              path="customers"
              element={
                <RequireAuth roles={["admin"]}>
                  <CustomersPage />
                </RequireAuth>
              }
            />
            <Route
              path="users"
              element={
                <RequireAuth roles={["admin"]}>
                  <UsersPage />
                </RequireAuth>
              }
            />

            {/* Website Maintenance – admin only */}
            <Route
              path="website/settings"
              element={
                <RequireAuth roles={["admin"]}>
                  <WebsiteSettingsPage />
                </RequireAuth>
              }
            />
            <Route
              path="website/faqs"
              element={
                <RequireAuth roles={["admin"]}>
                  <FaqsPage />
                </RequireAuth>
              }
            />
            <Route
              path="website/pages"
              element={
                <RequireAuth roles={["admin"]}>
                  <StaticPagesPage />
                </RequireAuth>
              }
            />

            {/* Backup – admin only */}
            <Route
              path="backup"
              element={
                <RequireAuth roles={["admin"]}>
                  <BackupPage />
                </RequireAuth>
              }
            />
          </Route>

          {/* ══════════════════════════════════════════════════════════════════
              STAFF PORTAL
          ══════════════════════════════════════════════════════════════════ */}
          <Route
            path="/staff"
            element={
              <RequireAuth roles={["admin", "staff"]}>
                <POSLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<POSDashboard />} />
            <Route path="products" element={<POSProductSearch />} />
            <Route path="order" element={<POSProcessOrder />} />
            <Route path="delivery" element={<POSDeliveryScheduling />} />
            <Route path="deliveries" element={<POSDeliveryManagement />} />
            <Route path="appointment" element={<POSAppointmentScheduling />} />
            <Route path="receipt/:id" element={<POSReceiptPage />} />
            <Route path="reports" element={<POSSalesReports />} />
            <Route path="inventory" element={<POSInventoryLookup />} />
            <Route path="blueprints" element={<POSBlueprintView />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
