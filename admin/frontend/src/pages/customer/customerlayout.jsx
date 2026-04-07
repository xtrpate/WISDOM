/**
 * components/customerlayout.jsx
 * Updated: Dynamic Home button, Brand Logo routing, Guest Auth Buttons, & Orders Badge
 */
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { useCart } from "./cartcontext";
import axios from "axios";
import {
  Home,
  Scissors,
  ShoppingBag,
  FileText,
  ShoppingCart,
  Package,
  Shield,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Settings,
  UserPlus,
  LogIn,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import "./customerlayout.css";
import "./profile.css";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/catalog", icon: ShoppingBag, label: "Products" },
  { to: "/appointment", icon: FileText, label: "Appointment" },
  { to: "/customize", icon: Scissors, label: "Customize" },
  { to: "/cart", icon: ShoppingCart, label: "Cart" },
  { to: "/orders", icon: Package, label: "My Orders" },
  { to: "/warranty", icon: Shield, label: "Warranty" },
  { to: "/faq", icon: HelpCircle, label: "FAQ" },
];

export default function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const visibleNavItems = navItems.filter((item) => {
    if (item.label === "Home" && user) {
      return false;
    }
    return true;
  });

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const { cartCount } = useCart();

  // 👉 NEW: State and Effect to track active orders for the badge
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    if (user) {
      axios
        .get("/api/customer/orders")
        .then((res) => {
          // Count only active orders (ignore completed and cancelled)
          const activeOrders = res.data.filter(
            (o) => !["completed", "cancelled"].includes(o.status),
          );
          setActiveOrdersCount(activeOrders.length);
        })
        .catch(console.error);
    } else {
      setActiveOrdersCount(0);
    }
  }, [user]);

  const customCartCount = (() => {
    try {
      const cart = JSON.parse(
        sessionStorage.getItem("cust_custom_cart") || "[]",
      );
      return cart.length;
    } catch {
      return 0;
    }
  })();

  const avatarSrc = user?.profile_photo
    ? `/uploads/avatars/${user.profile_photo}`
    : null;

  return (
    <div className="cust-root">
      {/* ── Top Navbar ── */}
      <header className="cust-navbar">
        <div className="navbar-inner">
          {/* Brand - Smart routing based on login status */}
          <div
            className="navbar-brand"
            onClick={() => navigate(user ? "/catalog" : "/")}
          >
            <div className="nav-logo">W</div>
            <div className="nav-brand-text">
              <span className="nav-brand-name">SPIRAL WOOD</span>
              <span className="nav-brand-sub">Services</span>
            </div>
          </div>

          {/* Desktop nav links */}
          <nav className="navbar-links">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <item.icon size={15} />
                <span>{item.label}</span>
                {/* Cart badge */}
                {item.to === "/cart" && cartCount > 0 && (
                  <span
                    style={{
                      background: "#c62828",
                      color: "white",
                      borderRadius: "50%",
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: -2,
                    }}
                  >
                    {cartCount}
                  </span>
                )}
                {/* Custom cart badge */}
                {item.to === "/customize" && customCartCount > 0 && (
                  <span className="nav-custom-cart-badge">
                    {customCartCount}
                  </span>
                )}
                {/* 👉 NEW: Active Orders badge */}
                {item.to === "/orders" && activeOrdersCount > 0 && (
                  <span
                    style={{
                      background: "#c62828",
                      color: "white",
                      borderRadius: "50%",
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: 4,
                    }}
                  >
                    {activeOrdersCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: Auth Buttons OR Profile Dropdown + mobile hamburger */}
          <div className="navbar-right">
            {user ? (
              /* ── IF LOGGED IN: Show Profile Dropdown ── */
              <div className="nav-user-wrapper" ref={dropdownRef}>
                <button
                  className="nav-user-btn"
                  onClick={() => setDropdownOpen((o) => !o)}
                  title="Account menu"
                >
                  {/* Avatar */}
                  <div className="nav-avatar">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      user?.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="nav-username">
                    {user?.name?.split(" ")[0]}
                  </span>
                  {/* 3 lines */}
                  <div className="nav-hamburger-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-user">
                      <div className="nav-dropdown-avatar">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="avatar" />
                        ) : (
                          user?.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="nav-dropdown-name">{user?.name}</span>
                        <span className="nav-dropdown-email">
                          {user?.email}
                        </span>
                      </div>
                    </div>

                    <div className="nav-dropdown-divider" />

                    <button
                      className="nav-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/profilesettings");
                      }}
                    >
                      <Settings size={15} /> Settings
                    </button>

                    <div className="nav-dropdown-divider" />

                    <button
                      className="nav-dropdown-item danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── IF LOGGED OUT: Show Sign In / Sign Up Buttons ── */
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginRight: "10px",
                }}
              >
                <button
                  className="nav-signin-btn"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </button>

                <button
                  onClick={() => navigate("/register")}
                  style={{
                    background: "#8B4513",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "8px 16px",
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="nav-hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <nav className="mobile-nav">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>

                {/* 👉 NEW: Mobile Active Orders badge */}
                {item.to === "/orders" && activeOrdersCount > 0 && (
                  <span
                    style={{
                      background: "#c62828",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      marginLeft: "auto",
                    }}
                  >
                    {activeOrdersCount} Active
                  </span>
                )}
              </NavLink>
            ))}

            {/* Mobile Auth/Profile Actions */}
            {user ? (
              <>
                <NavLink
                  to="/profilesettings"
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </NavLink>
                <button className="mobile-logout" onClick={handleLogout}>
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="mobile-nav-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </NavLink>
                <NavLink
                  to="/register"
                  className="mobile-nav-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <UserPlus size={16} />
                  <span>Sign Up</span>
                </NavLink>
              </>
            )}
          </nav>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="cust-main">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="cust-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div
              className="nav-logo"
              style={{ width: 32, height: 32, fontSize: 14 }}
            >
              W
            </div>
            <span>Spiral Wood Services</span>
          </div>
          <p>
            © {new Date().getFullYear()} Spiral Wood Services. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
