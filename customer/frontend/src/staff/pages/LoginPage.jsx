import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/PosAuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState(
    () => sessionStorage.getItem("auth_notice") || ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form.email, form.password);

      if (["staff", "admin"].includes(user.role)) {
        navigate("/staff/dashboard");
      } else {
        logout();
        setError("Access denied. Staff or Admin account required.");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      console.error("LOGIN ERROR RESPONSE:", err.response?.data);
      console.error("LOGIN ERROR STATUS:", err.response?.status);
      console.error("LOGIN ERROR MESSAGE:", err.message);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">W</div>
          <h1>WISDOM POS</h1>
          <p>Spiral Wood Services — Staff Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {authNotice && (
            <div
              style={{
                background: "#fff3cd",
                color: "#856404",
                border: "1px solid #ffe69c",
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {authNotice}
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <div className="field-group">
            <label>Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (authNotice) {
                  setAuthNotice("");
                  sessionStorage.removeItem("auth_notice");
                }
              }}
              placeholder="staff@spiralwood.com"
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                if (authNotice) {
                  setAuthNotice("");
                  sessionStorage.removeItem("auth_notice");
                }
              }}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-note">
          Only authorized staff accounts can access this portal.
          <br />
          Contact your administrator if you cannot log in.
        </p>
      </div>
    </div>
  );
}