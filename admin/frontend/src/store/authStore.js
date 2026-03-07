// src/store/authStore.js – Global auth state (Zustand)
import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user:  JSON.parse(localStorage.getItem('wisdom_user') || 'null'),
  token: localStorage.getItem('wisdom_token') || null,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('wisdom_token', data.token);
    localStorage.setItem('wisdom_user',  JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('wisdom_token');
    localStorage.removeItem('wisdom_user');
    set({ user: null, token: null });
  },

  refreshMe: async () => {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('wisdom_user', JSON.stringify(data));
    set({ user: data });
  },
}));

export default useAuthStore;
