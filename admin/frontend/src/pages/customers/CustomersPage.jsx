// src/pages/customers/CustomersPage.jsx – Customer Account Management (Admin)
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const APPROVAL_STYLE = {
  pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending Approval' },
  approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
};

export default function CustomersPage() {
  const [rows,    setRows]   = useState([]);
  const [total,   setTotal]  = useState(0);
  const [loading, setLoad]   = useState(true);
  const [filters, setFilters]= useState({ search: '', approval_status: '', page: 1 });
  const [detail,  setDetail] = useState(null); // { row } – view modal

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const { data } = await api.get('/customers', {
        params: { ...filters, limit: 20 },
      });
      setRows(data.rows);
      setTotal(data.total);
    } finally {
      setLoad(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  const doAction = async (id, action) => {
    const labels = {
      approve:    'Approve this customer account?',
      reject:     'Reject this customer account?',
      activate:   'Activate this account?',
      deactivate: 'Deactivate this account?',
      delete:     'Permanently delete this customer? This cannot be undone.',
    };
    if (!window.confirm(labels[action])) return;
    try {
      await api.patch(`/customers/${id}/status`, { action });
      toast.success(`Customer ${action}d.`);
      setDetail(null);
      load();
    } catch {}
  };

  // Counts per status for summary
  const pending  = rows.filter(r => r.approval_status === 'pending').length;
  const approved = rows.filter(r => r.approval_status === 'approved').length;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>Customer Account Management</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Review registrations, approve accounts, and manage customer access.
          </p>
        </div>
      </div>

      {/* ── Summary chips ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <SummaryChip label="Total Customers"  value={total}    color="#3b82f6" />
        <SummaryChip label="Pending Approval" value={pending}  color="#f59e0b" alert={pending > 0} />
        <SummaryChip label="Approved"         value={approved} color="#10b981" />
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          placeholder="Search name or email..."
          value={filters.search}
          onChange={e => setF('search', e.target.value)}
          style={inputSm}
        />
        <select value={filters.approval_status} onChange={e => setF('approval_status', e.target.value)} style={inputSm}>
          <option value="">All Status</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => setFilters({ search: '', approval_status: '', page: 1 })} style={btnGhost}>
          Reset
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Name','Email','Phone','Registered','Last Login','Approval','Active','Actions'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={centerCell}>Loading customers...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={centerCell}>No customers found.</td></tr>
            ) : rows.map(r => {
              const as = APPROVAL_STYLE[r.approval_status] || { bg: '#f1f5f9', color: '#475569', label: r.approval_status };
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={avatar}>{r.name?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.name}</div>
                        {r.is_verified
                          ? <div style={{ fontSize: 11, color: '#065f46' }}>✓ Email verified</div>
                          : <div style={{ fontSize: 11, color: '#dc2626' }}>✗ Not verified</div>
                        }
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 12 }}>{r.email}</td>
                  <td style={{ ...td, fontSize: 12 }}>{r.phone || '—'}</td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                    {new Date(r.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                    {r.last_login
                      ? new Date(r.last_login).toLocaleDateString('en-PH')
                      : <span style={{ color: '#94a3b8' }}>Never</span>
                    }
                  </td>
                  <td style={td}>
                    <span style={{ background: as.bg, color: as.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {as.label}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{
                      background: r.is_active ? '#d1fae5' : '#fee2e2',
                      color:      r.is_active ? '#065f46' : '#991b1b',
                      padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => setDetail({ row: r })} style={btnView}>View</button>
                      {r.approval_status === 'pending' && (
                        <>
                          <button onClick={() => doAction(r.id, 'approve')}  style={btnApprove}>✓ Approve</button>
                          <button onClick={() => doAction(r.id, 'reject')}   style={btnReject}>✕ Reject</button>
                        </>
                      )}
                      {r.approval_status === 'approved' && (
                        r.is_active
                          ? <button onClick={() => doAction(r.id, 'deactivate')} style={btnWarn}>Deactivate</button>
                          : <button onClick={() => doAction(r.id, 'activate')}   style={btnApprove}>Activate</button>
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
            <button disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} style={btnGhost}>← Prev</button>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Page {filters.page} of {Math.ceil(total / 20)}
            </span>
            <button disabled={filters.page >= Math.ceil(total / 20)}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} style={btnGhost}>Next →</button>
          </div>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      {detail && (
        <CustomerDetailModal
          row={detail.row}
          onClose={() => setDetail(null)}
          onAction={(action) => doAction(detail.row.id, action)}
        />
      )}
    </div>
  );
}

// ── Customer Detail Modal ─────────────────────────────────────────────────────
function CustomerDetailModal({ row, onClose, onAction }) {
  const as = APPROVAL_STYLE[row.approval_status] || { bg: '#f1f5f9', color: '#475569', label: row.approval_status };

  return (
    <div style={overlay}>
      <div style={modalBox}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ ...avatar, width: 52, height: 52, fontSize: 22 }}>
            {row.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{row.name}</h3>
            <span style={{ background: as.bg, color: as.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              {as.label}
            </span>
          </div>
        </div>

        {/* Details */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          {[
            ['Email',       row.email],
            ['Phone',       row.phone || '—'],
            ['Address',     row.address || '—'],
            ['Registered',  new Date(row.created_at).toLocaleString('en-PH')],
            ['Last Login',  row.last_login ? new Date(row.last_login).toLocaleString('en-PH') : 'Never'],
            ['Verified',    row.is_verified ? '✓ Email verified' : '✗ Not verified'],
            ['Account',     row.is_active ? 'Active' : 'Inactive'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
              <span style={{ color: '#374151', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {row.approval_status === 'pending' && (
            <>
              <button onClick={() => onAction('approve')}  style={btnApprove}>✓ Approve Account</button>
              <button onClick={() => onAction('reject')}   style={btnReject}>✕ Reject Account</button>
            </>
          )}
          {row.approval_status === 'approved' && (
            row.is_active
              ? <button onClick={() => onAction('deactivate')} style={btnWarn}>Deactivate Account</button>
              : <button onClick={() => onAction('activate')}   style={btnApprove}>Activate Account</button>
          )}
          <button
            onClick={() => { if (window.confirm(`Permanently delete ${row.name}?`)) { onAction('delete'); onClose(); } }}
            style={btnDelete}
          >
            🗑 Delete Account
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Summary Chip ──────────────────────────────────────────────────────────────
function SummaryChip({ label, value, color, alert }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 20px',
      borderLeft: `4px solid ${alert ? '#f59e0b' : color}`,
      boxShadow: '0 1px 6px rgba(0,0,0,.08)',
      display: 'flex', alignItems: 'center', gap: 12,
      minWidth: 160,
    }}>
      <div>
        <p style={{ fontSize: 11, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: alert ? '#f59e0b' : '#1e2a38', margin: '4px 0 0' }}>{value}</p>
      </div>
      {alert && <span style={{ fontSize: 20 }}>⚠️</span>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageTitle  = { fontSize: 22, fontWeight: 700, color: '#1e2a38', margin: 0 };
const card       = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' };
const th         = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td         = { padding: '11px 14px', color: '#374151', verticalAlign: 'middle' };
const centerCell = { textAlign: 'center', padding: 40, color: '#94a3b8' };
const inputSm    = { padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 180 };
const avatar     = { width: 36, height: 36, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 };
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = { background: '#fff', borderRadius: 12, padding: 28, width: 480, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const btnGhost   = { padding: '7px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnView    = { padding: '4px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const btnApprove = { padding: '5px 12px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnReject  = { padding: '5px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnWarn    = { padding: '5px 12px', background: '#fef9c3', color: '#854d0e', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnDelete  = { padding: '5px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
