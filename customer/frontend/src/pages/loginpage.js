import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import "./authpages.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(""); // non-error status messages
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const user = await login(form.email, form.password);
      if (user.role === "customer") {
        navigate("/");
      } else {
        setError("This portal is for customers only.");
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const message = err.response?.data?.message;

      if (code === "EMAIL_NOT_VERIFIED") {
        /* Send them back to OTP verification */
        navigate("/verify-otp", { state: { email: form.email } });
        return;
      }

      if (code === "PENDING_APPROVAL") {
        /* Show the pending screen inline */
        navigate("/pending-approval");
        return;
      }

      if (code === "ACCOUNT_REJECTED") {
        setError(
          "Your account application was not approved. Please contact support at support@spiralwood.com.",
        );
        setLoading(false);
        return;
      }

      if (code === "ACCOUNT_INACTIVE") {
        setError("Your account has been deactivated. Please contact support.");
        setLoading(false);
        return;
      }

      setError(message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-split">
        {/* ── Left brand panel ── */}
        <div className="auth-brand-panel">
          <div className="brand-logo">W</div>
          <h1>
            Welcome to
            <br />
            <span>Spiral Wood</span>
          </h1>
          <p>
            Your one-stop destination for premium custom cabinetry and wood
            furniture. Order products, track your builds, and manage everything
            from one place.
          </p>
          <div className="brand-features">
            {[
              { icon: "🪵", text: "Browse & order custom wood furniture" },
              { icon: "📐", text: "Choose from our blueprint gallery" },
              {
                icon: "📦",
                text: "Track your order from production to delivery",
              },
              { icon: "🛡️", text: "1-year warranty on all completed orders" },
            ].map((f) => (
              <div className="brand-feature" key={f.text}>
                <div className="brand-feature-icon">{f.icon}</div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right card ── */}
        <div className="auth-card-panel">
          <div className="auth-card-header">
            <div className="mobile-logo">W</div>
            <h2>Sign In</h2>
            <p>Welcome back! Enter your credentials to continue.</p>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button className="auth-tab active">Sign In</button>
            <button className="auth-tab" onClick={() => navigate("/register")}>
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            {info && <div className="alert alert-info">{info}</div>}

            {/* Email */}
            <div className="field">
              <label>Email Address</label>
              <div className="field-input-wrap">
                <Mail size={15} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label>Password</label>
              <div className="field-input-wrap">
                <Lock size={15} />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginTop: -8 }}>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 13,
                  color: "var(--wood-dark)",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="auth-switch" style={{ marginTop: 20 }}>
            Don't have an account?{" "}
            <button onClick={() => navigate("/register")}>Create one</button>
          </div>

          <p
            style={{
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "#bbb",
              marginTop: 24,
              lineHeight: 1.6,
            }}
          >
            By signing in, you agree to our Terms of Service
            <br />
            and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
