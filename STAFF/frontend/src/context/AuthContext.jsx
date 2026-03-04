import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("pos_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const stored = localStorage.getItem("pos_user");
      if (stored) setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post("/api/auth/login", { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem("pos_token", t);
    localStorage.setItem("pos_user", JSON.stringify(u));
    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
