// src/pages/orders/OrdersPage.jsx – Order Management (Admin)
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  confirmed:  { bg: '#dbeafe', color: '#1e40af' },
  processing: { bg: '#e9d5ff', color: '#6b21a8' },
  shipped:    { bg: '#e0f2fe', color: '#075985' },
  delivered:  { bg: '#dcfce7', color: '#166534' },
  completed:  { bg: '#d1fae5', color: '#065f46' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b' },
};

const PAYMENT_STYLE = {
  unpaid:            { bg: '#fee2e2', color: '#991b1b' },
  paid:              { bg: '#d1fae5', color: '#065f46' },
  partial:           { bg: '#fef9c3', color: '#854d0e' },
  contract_released: { bg: '#e9d5ff', color: '#6b21a8' },
};

export default function OrdersPage() {
  const navigate  = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', status: '', channel: '', from: '', to: '', page: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', {
        params: { ...filters, limit: 20 },
      });
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const quickAction = async (id, action, reason = '') => {
    try {
      if (action === 'accept') {
        await api.post(`/orders/${id}/accept`);
        toast.success('Order accepted.');
      } else {
        await api.post(`/orders/${id}/decline`, { reason });
        toast.success('Order declined.');
      }
      load();
    } catch {}
  };

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={row}>
        <h1 style={pageTitle}>Order Management</h1>
        <span style={{ fontSize: 13, color: '#64748b' }}>{total} total orders</span>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          placeholder="Search order ID or customer..."
          value={filters.search}
          onChange={e => setF('search', e.target.value)}
          style={inputSm}
        />
        <select value={filters.status} onChange={e => setF('status', e.target.value)} style={inputSm}>
          <option value="">All Status</option>
          {Object.keys(STATUS_STYLE).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={filters.channel} onChange={e => setF('channel', e.target.value)} style={inputSm}>
          <option value="">All Channels</option>
          <option value="online">Online</option>
          <option value="walkin">Walk-in (POS)</option>
        </select>
        <input type="date" value={filters.from} onChange={e => setF('from', e.target.value)} style={inputSm} />
        <input type="date" value={filters.to}   onChange={e => setF('to',   e.target.value)} style={inputSm} />
        <button onClick={() => setFilters({ search:'', status:'', channel:'', from:'', to:'', page:1 })} style={btnGhost}>
          Reset
        </button>
      </div>

      {/* ── Status summary chips ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLE).map(([s, style]) => (
          <button
            key={s}
            onClick={() => setF('status', filters.status === s ? '' : s)}
            style={{
              padding: '4px 12px', border: 'none', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filters.status === s ? style.color : style.bg,
              color:      filters.status === s ? '#fff'       : style.color,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div style={card}>
        <table style={tbl}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Order ID','Customer','Channel','Items','Amount','Payment','Status','Date','Actions'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={centerCell}>Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} style={centerCell}>No orders found.</td></tr>
            ) : orders.map(o => {
              const ss = STATUS_STYLE[o.status]  || { bg: '#f1f5f9', color: '#475569' };
              const ps = PAYMENT_STYLE[o.payment_status] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <button onClick={() => navigate(`/orders/${o.id}`)} style={linkBtn}>
                      #{String(o.id).padStart(5, '0')}
                    </button>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{o.customer_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.customer_phone}</div>
                  </td>
                  <td style={td}>
                    <span style={{
                      background: o.channel === 'online' ? '#dbeafe' : '#dcfce7',
                      color:      o.channel === 'online' ? '#1e40af' : '#166534',
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>
                      {o.channel === 'online' ? '🌐 Online' : '🏪 Walk-in'}
                    </span>
                  </td>
                  <td style={td}>{o.item_count ?? '—'}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    ₱ {Number(o.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={td}>
                    <span style={{ background: ps.bg, color: ps.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {o.payment_status?.replace('_', ' ') || 'unpaid'}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ background: ss.bg, color: ss.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                    {new Date(o.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => navigate(`/orders/${o.id}`)} style={btnView}>View</button>
                      {o.status === 'pending' && (
                        <>
                          <button onClick={() => quickAction(o.id, 'accept')} style={btnAccept}>✓</button>
                          <button
                            onClick={() => {
                              const reason = window.prompt('Reason for declining:');
                              if (reason !== null) quickAction(o.id, 'decline', reason);
                            }}
                            style={btnDecline}
                          >✕</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 }}>
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              style={btnGhost}
            >← Prev</button>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Page {filters.page} of {Math.ceil(total / 20)}
            </span>
            <button
              disabled={filters.page >= Math.ceil(total / 20)}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              style={btnGhost}
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const row       = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const pageTitle = { fontSize: 22, fontWeight: 700, color: '#1e2a38', margin: 0 };
const card      = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' };
const tbl       = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th        = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td        = { padding: '11px 14px', color: '#374151', verticalAlign: 'middle' };
const centerCell= { textAlign: 'center', padding: 40, color: '#94a3b8' };
const inputSm   = { padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };
const btnGhost  = { padding: '7px 14px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const linkBtn   = { background: 'none', border: 'none', color: '#1e40af', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const btnView   = { padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const btnAccept = { padding: '4px 10px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const btnDecline= { padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 };
