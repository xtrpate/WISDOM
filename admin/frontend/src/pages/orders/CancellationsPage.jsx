// src/pages/orders/CancellationsPage.jsx – Cancellation & Refund Management
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const POLICY_STYLE = {
  full_refund:      { bg: '#d1fae5', color: '#065f46',  label: 'Full Refund' },
  processing_fee:   { bg: '#fef9c3', color: '#854d0e',  label: '15% Fee Applied' },
  non_refundable:   { bg: '#fee2e2', color: '#991b1b',  label: 'Non-Refundable' },
  voided:           { bg: '#e0f2fe', color: '#075985',  label: 'Voided (POS)' },
};

export default function CancellationsPage() {
  const navigate            = useNavigate();
  const [rows,     setRows] = useState([]);
  const [loading,  setLoad] = useState(true);
  const [modal,    setModal]= useState(null); // { row }

  const load = async () => {
    setLoad(true);
    try {
      const { data } = await api.get('/orders/cancellations');
      setRows(data);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleProcess = async ({ approved, refund_amount, policy_applied }) => {
    try {
      await api.post(`/orders/${modal.row.order_id}/cancellation`, {
        approved,
        refund_amount,
        policy_applied,
      });
      toast.success(approved ? 'Cancellation approved.' : 'Cancellation rejected.');
      setModal(null);
      load();
    } catch {}
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>Cancellations & Refunds</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Review and process customer cancellation requests.
          </p>
        </div>
      </div>

      {/* Policy Reference */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
        <strong>Cancellation Policy:</strong>&nbsp;
        Standard orders cancelled before shipment → Full Refund. &nbsp;|&nbsp;
        Custom blueprint orders cancelled after down payment but before contract release → 15% processing fee deducted. &nbsp;|&nbsp;
        After contract release → Non-refundable. &nbsp;|&nbsp;
        POS same-day void before leaving premises → Full Refund.
      </div>

      {/* Table */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Order','Customer','Channel','Order Total','Policy','Refund Amt','Requested By','Status','Actions'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={centerCell}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={centerCell}>No cancellation requests found.</td></tr>
            ) : rows.map(r => {
              const p  = POLICY_STYLE[r.policy_applied] || { bg: '#f1f5f9', color: '#475569', label: r.policy_applied || '—' };
              const approved = r.approved_by !== null;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <button onClick={() => navigate(`/orders/${r.order_id}`)} style={linkBtn}>
                      #{String(r.order_id).padStart(5, '0')}
                    </button>
                  </td>
                  <td style={td}>{r.requested_by_name || '—'}</td>
                  <td style={td}>
                    <span style={{
                      background: r.channel === 'online' ? '#dbeafe' : '#dcfce7',
                      color:      r.channel === 'online' ? '#1e40af' : '#166534',
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>
                      {r.channel || '—'}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    ₱ {Number(r.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={td}>
                    {r.policy_applied
                      ? <span style={{ background: p.bg, color: p.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{p.label}</span>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>Pending review</span>
                    }
                  </td>
                  <td style={td}>
                    {r.refund_amount > 0
                      ? <span style={{ color: '#065f46', fontWeight: 600 }}>₱ {Number(r.refund_amount).toFixed(2)}</span>
                      : '—'
                    }
                  </td>
                  <td style={td}>{r.requested_by_name || '—'}</td>
                  <td style={td}>
                    {approved
                      ? <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Approved</span>
                      : <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Pending</span>
                    }
                  </td>
                  <td style={td}>
                    {!approved && (
                      <button onClick={() => setModal({ row: r })} style={btnView}>Process</button>
                    )}
                    {approved && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        by {r.approved_by_name || 'Admin'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Process Modal */}
      {modal && <ProcessModal row={modal.row} onClose={() => setModal(null)} onSubmit={handleProcess} />}
    </div>
  );
}

// ── Process Cancellation Modal ────────────────────────────────────────────────
function ProcessModal({ row, onClose, onSubmit }) {
  const [policy,  setPolicy]  = useState('full_refund');
  const [refund,  setRefund]  = useState(Number(row.total_amount || 0).toFixed(2));
  const [approved, setApproved] = useState(true);

  // Auto-calculate refund based on policy
  const handlePolicyChange = (p) => {
    setPolicy(p);
    const total = Number(row.total_amount || 0);
    if (p === 'full_refund')    setRefund(total.toFixed(2));
    if (p === 'processing_fee') setRefund((total * 0.85).toFixed(2));
    if (p === 'non_refundable') setRefund('0.00');
    if (p === 'voided')         setRefund(total.toFixed(2));
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, width: 480 }}>
        <h3 style={{ margin: '0 0 6px' }}>Process Cancellation Request</h3>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>
          Order #{String(row.order_id).padStart(5,'0')} — Total: ₱ {Number(row.total_amount||0).toFixed(2)}
        </p>

        {row.reason && (
          <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
            <strong>Customer reason:</strong> {row.reason}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelSm}>Approval Decision</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" checked={approved}  onChange={() => setApproved(true)}  /> Approve Cancellation
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" checked={!approved} onChange={() => setApproved(false)} /> Reject Request
            </label>
          </div>
        </div>

        {approved && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSm}>Cancellation Policy to Apply</label>
              <select value={policy} onChange={e => handlePolicyChange(e.target.value)} style={inputFull}>
                <option value="full_refund">Full Refund (before shipment)</option>
                <option value="processing_fee">15% Processing Fee (after down payment)</option>
                <option value="non_refundable">Non-Refundable (after contract release)</option>
                <option value="voided">Voided — POS Same-day</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSm}>Refund Amount (₱)</label>
              <input
                type="number" step="0.01" value={refund}
                onChange={e => setRefund(e.target.value)}
                style={inputFull}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Auto-calculated based on policy. Adjust manually if needed.
              </p>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button
            onClick={() => onSubmit({ approved, refund_amount: refund, policy_applied: policy })}
            style={approved ? btnPrimary : btnDecline}
          >
            {approved ? 'Approve & Process' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageTitle = { fontSize: 22, fontWeight: 700, color: '#1e2a38', margin: 0 };
const card      = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' };
const th        = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td        = { padding: '11px 14px', color: '#374151', verticalAlign: 'middle' };
const centerCell= { textAlign: 'center', padding: 40, color: '#94a3b8' };
const labelSm   = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const inputFull = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox  = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const btnPrimary= { padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnGhost  = { padding: '8px 20px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnView   = { padding: '4px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const btnDecline= { padding: '8px 20px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const linkBtn   = { background: 'none', border: 'none', color: '#1e40af', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
