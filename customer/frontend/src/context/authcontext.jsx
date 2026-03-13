/**
 * context/AuthContext.jsx
 * Customer portal — matches wisdom_db + customer.auth.js
 */
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("cust_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const stored = localStorage.getItem("cust_user");
      if (stored) setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, [token]);

  /* ── Register → returns { message, user_id } ── */
  const register = async (payload) => {
    const res = await axios.post("/api/customer/auth/register", payload);
    return res.data;
  };

  /* ── Verify OTP → returns { message } ── */
  const verifyOtp = async (email, otp) => {
    const res = await axios.post("/api/customer/auth/verify-otp", {
      email,
      otp,
    });
    return res.data;
  };

  /* ── Resend OTP → returns { message } ── */
  const resendOtp = async (email) => {
    const res = await axios.post("/api/customer/auth/resend-otp", { email });
    return res.data;
  };

  /*
   * ── Login ──
   * Backend gate codes (thrown as axios errors with response.data.code):
   *   EMAIL_NOT_VERIFIED  → redirect to OTP step
   *   PENDING_APPROVAL    → show pending screen
   *   ACCOUNT_REJECTED    → show rejected message
   *   ACCOUNT_INACTIVE    → show deactivated message
   */
  const login = async (email, password) => {
    const res = await axios.post("/api/customer/auth/login", {
      email,
      password,
    });
    const { token: t, user: u } = res.data;
    localStorage.setItem("cust_token", t);
    localStorage.setItem("cust_user", JSON.stringify(u));
    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  /* ── Logout ── */
  const logout = () => {
    localStorage.removeItem("cust_token");
    localStorage.removeItem("cust_user");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        register,
        verifyOtp,
        resendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
