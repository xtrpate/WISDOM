import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import POSLayout from './components/POSLayout';
import Dashboard from './pages/Dashboard';
import ProductSearch from './pages/ProductSearch';
import ProcessOrder from './pages/ProcessOrder';
import DeliveryScheduling from './pages/DeliveryScheduling';
import AppointmentScheduling from './pages/AppointmentScheduling';
import ReceiptPage from './pages/ReceiptPage';
import SalesReports from './pages/SalesReports';
import BlueprintView from './pages/BlueprintView';
import InventoryLookup from './pages/InventoryLookup';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <POSLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<ProductSearch />} />
            <Route path="order" element={<ProcessOrder />} />
            <Route path="delivery" element={<DeliveryScheduling />} />
            <Route path="appointment" element={<AppointmentScheduling />} />
            <Route path="receipt/:id" element={<ReceiptPage />} />
            <Route path="reports" element={<SalesReports />} />
            <Route path="blueprints" element={<BlueprintView />} />
            <Route path="inventory" element={<InventoryLookup />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
