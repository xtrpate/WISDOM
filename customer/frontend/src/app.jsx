import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/authcontext";
import { CartProvider } from "./context/cartcontext";
import { CustomCartProvider } from "./context/customcartcontext";

import LoginPage from "./pages/loginpage";
import RegisterPage from "./pages/registerpage";
import VerifyOtpPage from "./pages/verifyotppage";
import PendingApprovalPage from "./pages/pendingapprovalpage";
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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
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
  if (!user) return <Navigate to="/login" replace />;
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
    <AuthProvider>
      <CartProvider>
        <CustomCartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route
                path="/pending-approval"
                element={<PendingApprovalPage />}
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <CustomerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/catalog" replace />} />
                <Route path="home" element={<ComingSoon title="Home" />} />
                <Route path="catalog" element={<ProductCatalog />} />
                <Route path="appointment" element={<AppointmentPage />} />
                <Route path="customize" element={<CustomizePage />} />
                <Route path="custom-cart" element={<CustomCartPage />} />
                <Route
                  path="custom-checkout"
                  element={<CustomCheckoutPage />}
                />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="warranty" element={<WarrantyPage />} />
                <Route path="faq" element={<ComingSoon title="FAQ" />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </CustomCartProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
