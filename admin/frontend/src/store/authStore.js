// src/store/authStore.js – Global auth state (Zustand)
import { create } from "zustand";
import api from "../services/api";

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("wisdom_user") || "null"),
  token: localStorage.getItem("wisdom_token") || null,

  login: async (email, password) => {
    // 👉 FIX: Pointed to /customer/auth
    const { data } = await api.post("/customer/auth/login", {
      email,
      password,
    });
    localStorage.setItem("wisdom_token", data.token);
    localStorage.setItem("wisdom_user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data.user;
  },

  register: async (userData) => {
    // 👉 FIX: Pointed to /customer/auth
    const { data } = await api.post("/customer/auth/register", userData);
    return data;
  },

  verifyOtp: async (email, otp) => {
    // 👉 FIX: Pointed to /customer/auth
    const { data } = await api.post("/customer/auth/verify-otp", {
      email,
      otp,
    });
    return data;
  },

  resendOtp: async (email) => {
    // 👉 FIX: Pointed to /customer/auth
    const { data } = await api.post("/customer/auth/resend-otp", { email });
    return data;
  },

  logout: () => {
    localStorage.removeItem("wisdom_token");
    localStorage.removeItem("wisdom_user");
    set({ user: null, token: null });
  },

  refreshMe: async () => {
    // 👉 FIX: Pointed to /customer/auth
    const { data } = await api.get("/customer/auth/me");
    localStorage.setItem("wisdom_user", JSON.stringify(data));
    set({ user: data });
  },
}));

export default useAuthStore;
