/**
 * components/customerlayout.jsx
 * Updated: 3-line hamburger on profile → dropdown with Settings + Logout
 */
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import "./customerlayout.css";
import "./profile.css";

const navItems = [
  { to: "/home", icon: Home, label: "Home" },
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

  const cartCount = (() => {
    try {
      const cart = JSON.parse(sessionStorage.getItem("cust_cart") || "[]");
      return cart.reduce((s, i) => s + i.quantity, 0);
    } catch {
      return 0;
    }
  })();

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
          {/* Brand */}
          <div className="navbar-brand" onClick={() => navigate("/home")}>
            <div className="nav-logo">W</div>
            <div className="nav-brand-text">
              <span className="nav-brand-name">SPIRAL WOOD</span>
              <span className="nav-brand-sub">Services</span>
            </div>
          </div>

          {/* Desktop nav links */}
          <nav className="navbar-links">
            {navItems.map((item) => (
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
              </NavLink>
            ))}
          </nav>

          {/* Right: profile dropdown + mobile hamburger */}
          <div className="navbar-right">
            {/* ── Profile dropdown ── */}
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
                  {/* User info */}
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
                      <span className="nav-dropdown-email">{user?.email}</span>
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
            {navItems.map((item) => (
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
              </NavLink>
            ))}
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
