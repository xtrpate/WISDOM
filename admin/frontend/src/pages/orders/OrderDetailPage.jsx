// src/pages/orders/OrderDetailPage.jsx – Full Order Detail View (Admin)
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','completed','cancelled'];

export default function OrderDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  // UI state
  const [statusModal,   setStatusModal]   = useState(false);
  const [newStatus,     setNewStatus]     = useState('');
  const [receiptFile,   setReceiptFile]   = useState(null);
  const [uploading,     setUploading]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
      setNewStatus(data.status);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const handleStatusUpdate = async () => {
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      toast.success(`Status updated to "${newStatus}".`);
      setStatusModal(false);
      load();
    } catch {}
  };

  const handleAccept  = async () => { await api.post(`/orders/${id}/accept`);  toast.success('Order accepted.');  load(); };
  const handleDecline = async () => {
    const reason = window.prompt('Enter reason for declining:');
    if (reason === null) return;
    await api.post(`/orders/${id}/decline`, { reason });
    toast.success('Order declined.');
    load();
  };

  const verifyPayment = async (paymentId, action) => {
    try {
      await api.post(`/orders/${id}/verify-payment`, { payment_id: paymentId, action });
      toast.success(`Payment ${action}.`);
      load();
    } catch {}
  };

  const uploadDeliveryReceipt = async () => {
    if (!receiptFile) { toast.error('Please select a file.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('receipt', receiptFile);
      await api.post(`/orders/${id}/delivery-receipt`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Delivery receipt uploaded. Order marked as completed.');
      setReceiptFile(null);
      load();
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div style={center}>Loading order...</div>;
  if (!order)  return <div style={center}>Order not found.</div>;

  const ss = STATUS_STYLE[order.status] || { bg: '#f1f5f9', color: '#475569' };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/orders')} style={btnBack}>← Orders</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e2a38', margin: 0 }}>
          Order #{String(order.id).padStart(5, '0')}
        </h1>
        <span style={{ background: ss.bg, color: ss.color, padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          {order.status}
        </span>
        <span style={{
          background: order.channel === 'online' ? '#dbeafe' : '#dcfce7',
          color:      order.channel === 'online' ? '#1e40af' : '#166534',
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        }}>
          {order.channel === 'online' ? '🌐 Online' : '🏪 Walk-in'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {order.status === 'pending' && (
            <>
              <button onClick={handleAccept}  style={btnAccept}>✓ Accept</button>
              <button onClick={handleDecline} style={btnDecline}>✕ Decline</button>
            </>
          )}
          <button onClick={() => setStatusModal(true)} style={btnPrimary}>Update Status</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ── Customer Info ──────────────────────────────────────── */}
        <Section title="👤 Customer Information">
          <InfoRow label="Name"    value={order.customer_name} />
          <InfoRow label="Email"   value={order.customer_email} />
          <InfoRow label="Phone"   value={order.customer_phone} />
          <InfoRow label="Address" value={order.customer_address || '—'} />
        </Section>

        {/* ── Order Summary ──────────────────────────────────────── */}
        <Section title="📋 Order Summary">
          <InfoRow label="Date Placed"    value={new Date(order.created_at).toLocaleString('en-PH')} />
          <InfoRow label="Payment Method" value={order.payment_method?.replace('_', ' ') || '—'} />
          <InfoRow label="Payment Status" value={order.payment_status?.replace('_', ' ') || 'unpaid'} />
          <InfoRow label="Total Amount"   value={`₱ ${Number(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} bold />
        </Section>
      </div>

      {/* ── Order Items ─────────────────────────────────────────── */}
      <Section title="📦 Order Items">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Product','Qty','Unit Price','Production Cost','Subtotal'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{item.product_name}</td>
                <td style={td}>{item.quantity}</td>
                <td style={td}>₱ {Number(item.unit_price).toFixed(2)}</td>
                <td style={td}>₱ {Number(item.production_cost).toFixed(2)}</td>
                <td style={{ ...td, fontWeight: 600 }}>₱ {Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td colSpan={4} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>Total</td>
              <td style={{ ...td, fontWeight: 700, color: '#1e40af', fontSize: 15 }}>
                ₱ {Number(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </Section>

      {/* ── Payments ────────────────────────────────────────────── */}
      <Section title="💳 Payment Transactions">
        {(!order.payments || order.payments.length === 0) ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No payment records yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Amount','Method','Status','Proof','Verified By','Date','Actions'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.payments.map(p => {
                const ps = { pending: ['#fef9c3','#854d0e'], verified: ['#d1fae5','#065f46'], rejected: ['#fee2e2','#991b1b'] }[p.status] || ['#f1f5f9','#475569'];
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, fontWeight: 600 }}>₱ {Number(p.amount).toFixed(2)}</td>
                    <td style={td}>{p.payment_method?.replace('_', ' ')}</td>
                    <td style={td}>
                      <span style={{ background: ps[0], color: ps[1], padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={td}>
                      {p.proof_url
                        ? <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ color: '#1e40af', fontSize: 12 }}>View Proof</a>
                        : '—'
                      }
                    </td>
                    <td style={td}>{p.verified_by || '—'}</td>
                    <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                      {new Date(p.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td style={td}>
                      {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => verifyPayment(p.id, 'verified')} style={btnAccept}>✓ Verify</button>
                          <button onClick={() => verifyPayment(p.id, 'rejected')} style={btnDecline}>✕ Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Delivery ────────────────────────────────────────────── */}
      {order.delivery && (
        <Section title="🚚 Delivery Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InfoRow label="Scheduled Date" value={order.delivery.scheduled_date ? new Date(order.delivery.scheduled_date).toLocaleString('en-PH') : '—'} />
            <InfoRow label="Status"         value={order.delivery.status} />
            <InfoRow label="Address"        value={order.delivery.address || '—'} />
            <InfoRow label="Signed Receipt" value={order.delivery.signed_receipt
              ? <a href={order.delivery.signed_receipt} target="_blank" rel="noreferrer" style={{ color: '#1e40af' }}>View Receipt</a>
              : 'Not uploaded'
            } />
          </div>

          {/* Upload delivery receipt */}
          {!order.delivery.signed_receipt && ['shipped','delivered'].includes(order.status) && (
            <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px dashed #94a3b8' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 0 }}>Upload Signed Delivery Receipt</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setReceiptFile(e.target.files[0])}
                  style={{ fontSize: 13 }}
                />
                <button onClick={uploadDeliveryReceipt} disabled={uploading} style={btnPrimary}>
                  {uploading ? 'Uploading...' : '📤 Upload & Complete'}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Contract ────────────────────────────────────────────── */}
      {order.contract && (
        <Section title="📝 Contract">
          <InfoRow label="Generated On" value={new Date(order.contract.created_at).toLocaleString('en-PH')} />
          <InfoRow label="Warranty Terms" value={order.contract.warranty_terms || '—'} />
          <div style={{ marginTop: 10, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
            <strong>Contract Terms:</strong>
            <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{order.contract.terms}</p>
          </div>
        </Section>
      )}

      {/* ── Status Update Modal ──────────────────────────────────── */}
      {statusModal && (
        <div style={overlay}>
          <div style={modalBox}>
            <h3 style={{ margin: '0 0 16px' }}>Update Order Status</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Current status: <strong>{order.status}</strong>
            </p>
            <label style={labelSm}>New Status</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inputFull, marginBottom: 20 }}>
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStatusModal(false)} style={btnGhost}>Cancel</button>
              <button onClick={handleStatusUpdate} style={btnPrimary}>Update Status</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,.08)', gridColumn: 'span 1' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e2a38', margin: '0 0 14px', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#374151', fontWeight: bold ? 700 : 400, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const center    = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' };
const th        = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td        = { padding: '10px 14px', color: '#374151', verticalAlign: 'middle' };
const labelSm   = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const inputFull = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox  = { background: '#fff', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const btnBack   = { padding: '6px 14px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnPrimary= { padding: '8px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnGhost  = { padding: '8px 18px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnAccept = { padding: '5px 12px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const btnDecline= { padding: '5px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 };
