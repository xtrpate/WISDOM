import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Search,
  ShoppingCart,
  Truck,
  CalendarClock,
  Receipt,
  BarChart3,
  FileText,
  Package,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ClipboardList,
  Bell,
  Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./POSLayout.css";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/products", icon: Search, label: "Product Search" },
  {
    to: "/assignments",
    icon: ClipboardList,
    label: "Assignments",
    id: "assignments",
  }, // Added Assignments here
  { to: "/order", icon: ShoppingCart, label: "Process Order" },
  { to: "/delivery", icon: Truck, label: "Delivery Scheduling" },
  { to: "/appointment", icon: CalendarClock, label: "Appointments" },
  { to: "/reports", icon: BarChart3, label: "Sales Reports" },
  { to: "/blueprints", icon: FileText, label: "Blueprints" },
  { to: "/inventory", icon: Package, label: "Inventory Lookup" },
];

export default function POSLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Notification States
  const [unreadTaskCount, setUnreadTaskCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const axiosInstance = axios.create();
  axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); // Use your actual token key
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Fetch unread counts for both tasks (sidebar dot) and notifications (bell dot)
  const fetchUnreadCounts = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get("/api/pos/tasks/unread-count");
      setUnreadTaskCount(res.data.task_count);
      setUnreadNotifCount(res.data.notification_count);
    } catch (err) {
      console.error("Failed to fetch unread counts");
    }
  };

  // Fetch the actual list of notifications
  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get("/api/pos/tasks/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user, location]);

  // Handle clicking outside the notification dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) {
      fetchNotifications(); // Load latest notifications when opening
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axiosInstance.put(`/api/pos/tasks/notifications/${id}/read`);
      fetchNotifications();
      fetchUnreadCounts();
    } catch (err) {
      console.error("Failed to mark read");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Format timestamp nicely
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div
      className={`pos-root ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
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
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}

              {/* Red Dot for Assignments in Sidebar (Only for Staff) */}
              {item.id === "assignments" &&
                unreadTaskCount > 0 &&
                user?.role !== "admin" && (
                  <div className="sidebar-notification-dot"></div>
                )}

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
        {/* Top Action Bar - Placed at top left of the dashboard area */}
        <div
          className="top-action-bar"
          style={{ justifyContent: "flex-start", marginBottom: "24px" }}
        >
          <div className="notification-bell-wrapper" ref={notifRef}>
            <div
              className="notification-bell-container"
              onClick={handleBellClick}
              style={{ padding: "8px" }}
            >
              <Bell size={22} color="#555" />
              {unreadNotifCount > 0 && (
                <div className="notification-dot-overlay"></div>
              )}
            </div>

            {/* Notification Dropdown UI */}
            {isNotifOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "50px",
                  left: "0",
                  width: "320px",
                  background: "white",
                  borderRadius: "10px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  border: "1px solid #e0e0e0",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid #eee",
                    background: "#f9fafb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "14px", color: "#1a1a2e" }}>
                    Notifications
                  </h4>
                  {unreadNotifCount > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        background: "#d2691e",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {unreadNotifCount} New
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#888",
                        fontSize: "13px",
                      }}
                    >
                      You have no notifications.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f0f0f0",
                          background: notif.is_read ? "white" : "#fffaf7",
                          display: "flex",
                          gap: "10px",
                          transition: "background 0.2s",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h5
                            style={{
                              margin: "0 0 4px 0",
                              fontSize: "13px",
                              color: "#333",
                            }}
                          >
                            {notif.title}
                          </h5>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#666",
                              lineHeight: "1.4",
                            }}
                          >
                            {notif.message}
                          </p>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#999",
                              display: "block",
                              marginTop: "6px",
                            }}
                          >
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            title="Mark as read"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#d2691e",
                              cursor: "pointer",
                              padding: "4px",
                              height: "fit-content",
                            }}
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
