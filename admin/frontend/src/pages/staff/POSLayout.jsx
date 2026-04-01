import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./PosAuthContext";
import {
  LayoutDashboard,
  Search,
  ShoppingCart,
  Truck,
  CalendarClock,
  BarChart3,
  FileText,
  Package,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import "./POSLayout.css";

const navItems = [
  {
    to: "/staff/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/products",
    icon: Search,
    label: "Product Search",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/order",
    icon: ShoppingCart,
    label: "Process Order",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/delivery",
    icon: Truck,
    label: "Delivery Scheduling",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/deliveries",
    icon: Truck,
    label: "Delivery Management",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/appointment",
    icon: CalendarClock,
    label: "Appointments",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/reports",
    icon: BarChart3,
    label: "Sales Reports",
    roles: ["staff", "admin"],
  },
  {
    to: "/staff/blueprints",
    icon: FileText,
    label: "Blueprints",
    roles: ["admin"],
  },
  {
    to: "/staff/inventory",
    icon: Package,
    label: "Inventory Lookup",
    roles: ["staff", "admin"],
  },
];

export default function POSLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role),
  );

  const handleLogout = () => {
    logout();
    navigate("/staff/login");
  };

  return (
    <div
      className={`pos-root ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
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
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
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

      <main className="pos-main">
        <Outlet />
      </main>
    </div>
  );
}
