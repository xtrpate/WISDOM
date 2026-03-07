// src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoad]  = useState(false);
  const { login }           = useAuthStore();
  const navigate            = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoad(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch {
      // Error toasted by axios interceptor
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1e2a38 0%, #2d4a6e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🪵</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a38', margin: '8px 0 4px' }}>WISDOM</h1>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Spiral Wood Services · Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email Address</label>
          <input
            type="email" required value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={inputStyle} placeholder="admin@spiralwood.com"
          />
          <label style={labelStyle}>Password</label>
          <input
            type="password" required value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={inputStyle} placeholder="••••••••"
          />
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#1e40af',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 16 };
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none',
};
