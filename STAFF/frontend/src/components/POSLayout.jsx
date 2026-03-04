import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Search, ShoppingCart, Truck,
  CalendarClock, Receipt, BarChart3, FileText,
  Package, LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import './POSLayout.css';

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',    icon: Search,           label: 'Product Search' },
  { to: '/order',       icon: ShoppingCart,     label: 'Process Order' },
  { to: '/delivery',    icon: Truck,            label: 'Delivery Scheduling' },
  { to: '/appointment', icon: CalendarClock,    label: 'Appointments' },
  { to: '/reports',     icon: BarChart3,        label: 'Sales Reports' },
  { to: '/blueprints',  icon: FileText,         label: 'Blueprints' },
  { to: '/inventory',   icon: Package,          label: 'Inventory Lookup' },
];

export default function POSLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`pos-root ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar */}
      <aside className="pos-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">W</div>
            {sidebarOpen && (
              <div className="logo-text">
                <span className="logo-name">WISDOM</span>
                <span className="logo-sub">POS System</span>
              </div>
            )}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && <ChevronRight size={14} className="nav-arrow" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="pos-main">
        <Outlet />
      </main>
    </div>
  );
}
