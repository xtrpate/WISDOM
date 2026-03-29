import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Customer providers
import { AuthProvider as CustomerAuthProvider, useAuth as useCustomerAuth } from "./context/authcontext";
import { CartProvider } from "./context/cartcontext";
import { CustomCartProvider } from "./context/customcartcontext";

// Customer pages
import LoginPage from "./pages/loginpage";
import RegisterPage from "./pages/registerpage";
import VerifyOtpPage from "./pages/verifyotppage";
import ForgotPasswordPage from "./pages/forgotpasswordpage";
import ResetPasswordPage from "./pages/resetpasswordpage";

import CustomerLayout from "./components/customerlayout";
import ProductCatalog from "./pages/productcatalog";
import CartPage from "./pages/cartpage";
import CheckoutPage from "./pages/checkoutpage";
import ProfileSettings from "./pages/profilesettings";
import OrdersPage from "./pages/orderspage";
import AppointmentPage from "./pages/appointmentpage";
import CustomizePage from "./pages/customizepage";
import CustomCartPage from "./pages/customcartpage";
import CustomCheckoutPage from "./pages/customcheckoutpage";
import WarrantyPage from "./pages/warrantypage";

// Staff providers
import { AuthProvider as StaffAuthProvider, useAuth as useStaffAuth } from "./staff/context/PosAuthContext";

// Staff pages
import POSLayout from "./staff/components/POSLayout";
import StaffLoginPage from "./staff/pages/LoginPage";
import Dashboard from "./staff/pages/Dashboard";
import ProductSearch from "./staff/pages/ProductSearch";
import ProcessOrder from "./staff/pages/ProcessOrder";
import DeliveryScheduling from "./staff/pages/DeliveryScheduling";
import AppointmentScheduling from "./staff/pages/AppointmentScheduling";
import ReceiptPage from "./staff/pages/ReceiptPage";
import DeliveryManagement from "./staff/pages/DeliveryManagement";
import SalesReports from "./staff/pages/SalesReports";
import BlueprintView from "./staff/pages/BlueprintView";
import InventoryLookup from "./staff/pages/InventoryLookup";

const CustomerProviders = () => (
  <CustomerAuthProvider>
    <CartProvider>
      <CustomCartProvider>
        <Outlet />
      </CustomCartProvider>
    </CartProvider>
  </CustomerAuthProvider>
);

const StaffProviders = () => (
  <StaffAuthProvider>
    <Outlet />
  </StaffAuthProvider>
);

const CustomerProtectedRoute = ({ children }) => {
  const { user, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#888",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const StaffProtectedRoute = ({ children, allowedRoles = ["staff", "admin"] }) => {
  const { user, loading } = useStaffAuth();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/staff/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return children;
};

const ComingSoon = ({ title }) => (
  <div style={{ textAlign: "center", padding: "80px 20px" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
    <h2
      style={{
        fontFamily: "'Playfair Display', serif",
        color: "#1a1a2e",
        marginBottom: 8,
      }}
    >
      {title}
    </h2>
    <p style={{ color: "#888" }}>This module is coming soon.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* CUSTOMER SIDE */}
        <Route element={<CustomerProviders />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          

          <Route
            path="/"
            element={
              <CustomerProtectedRoute>
                <CustomerLayout />
              </CustomerProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="home" element={<ComingSoon title="Home" />} />
            <Route path="catalog" element={<ProductCatalog />} />
            <Route path="appointment" element={<AppointmentPage />} />
            <Route path="customize" element={<CustomizePage />} />
            <Route path="custom-cart" element={<CustomCartPage />} />
            <Route path="custom-checkout" element={<CustomCheckoutPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="settings" element={<ProfileSettings />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="warranty" element={<WarrantyPage />} />
            <Route path="faq" element={<ComingSoon title="FAQ" />} />
          </Route>
        </Route>

        {/* STAFF SIDE */}
        <Route path="/staff" element={<StaffProviders />}>
          <Route path="login" element={<StaffLoginPage />} />

          <Route
            element={
              <StaffProtectedRoute>
                <POSLayout />
              </StaffProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<ProductSearch />} />
            <Route path="order" element={<ProcessOrder />} />
            <Route path="delivery" element={<DeliveryScheduling />} />
            <Route path="deliveries" element={<DeliveryManagement />} />
            <Route path="appointment" element={<AppointmentScheduling />} />
            <Route path="receipt/:id" element={<ReceiptPage />} />
            <Route path="reports" element={<SalesReports />} />
            <Route
              path="blueprints"
              element={
                <StaffProtectedRoute allowedRoles={["admin"]}>
                  <BlueprintView />
                </StaffProtectedRoute>
              }
            />
            <Route path="inventory" element={<InventoryLookup />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;