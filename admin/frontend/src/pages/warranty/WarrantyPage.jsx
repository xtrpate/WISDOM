// src/pages/warranty/WarrantyPage.jsx – Warranty Management (Admin)
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', color: '#854d0e',  label: 'Pending' },
  approved:  { bg: '#dbeafe', color: '#1e40af',  label: 'Approved' },
  rejected:  { bg: '#fee2e2', color: '#991b1b',  label: 'Rejected' },
  fulfilled: { bg: '#d1fae5', color: '#065f46',  label: 'Fulfilled' },
};

const TABS = [
  { key: '',       label: '📋 All Claims' },
  { key: 'online', label: '🌐 Online Warranty' },
  { key: 'walkin', label: '🏪 Walk-in Warranty' },
];

export default function WarrantyPage() {
  const [tab,     setTab]    = useState('');
  const [rows,    setRows]   = useState([]);
  const [total,   setTotal]  = useState(0);
  const [loading, setLoad]   = useState(true);
  const [filters, setFilters]= useState({ search: '', status: '', from: '', to: '', page: 1 });
  const [modal,   setModal]  = useState(null); // { row }

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const { data } = await api.get('/warranty', {
        params: { ...filters, type: tab, limit: 20 },
      });
      setRows(data.rows);
      setTotal(data.total);
    } finally {
      setLoad(false);
    }
  }, [tab, filters]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc      = new jsPDF();
    const tabLabel = TABS.find(t => t.key === tab)?.label || 'All Claims';

    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text('Spiral Wood Services', 105, 14, { align: 'center' });
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text('8 Sitio Laot, Prenza 1, Marilao, Bulacan', 105, 20, { align: 'center' });
    doc.setFontSize(13).setFont('helvetica', 'bold');
    doc.text(`WARRANTY CLAIMS — ${tabLabel.replace(/[📋🌐🏪]/g, '').trim()}`, 105, 28, { align: 'center' });
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 105, 34, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Customer', 'Product', 'Reason', 'Channel', 'Expiry', 'Status', 'Date Filed']],
      body: rows.map((r, i) => [
        i + 1,
        r.customer_name,
        r.product_name,
        r.reason?.slice(0, 40) + (r.reason?.length > 40 ? '…' : ''),
        r.order_channel || '—',
        r.warranty_expiry ? new Date(r.warranty_expiry).toLocaleDateString('en-PH') : '—',
        r.status,
        new Date(r.created_at).toLocaleDateString('en-PH'),
      ]),
      styles:     { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.setFontSize(10).setFont('helvetica', 'normal');
    const finalY = doc.lastAutoTable.finalY + 16;
    doc.text(`Total Records: ${rows.length}`, 14, finalY);
    doc.text('___________________________', 14, finalY + 20);
    doc.text('Authorized Signatory / Owner', 14, finalY + 26);

    doc.save(`wisdom_warranty_${tab || 'all'}_${Date.now()}.pdf`);
    toast.success('PDF exported.');
  };

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>Warranty Management</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Track all warranty claims. 1-year warranty period applies to all completed orders.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportPDF}       style={btnGhost}>📄 Export PDF</button>
          <button onClick={() => window.print()} style={btnGhost}>🖨️ Print</button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setFilters(f => ({ ...f, page: 1 })); }}
            style={{
              padding: '9px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              color:        tab === t.key ? '#1e40af' : '#64748b',
              borderBottom: tab === t.key ? '2px solid #1e40af' : '2px solid transparent',
              marginBottom: -2,
            }}
          >{t.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12, color: '#94a3b8' }}>
          {total} claim{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Summary badges ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <button key={key}
            onClick={() => setF('status', filters.status === key ? '' : key)}
            style={{
              padding: '4px 14px', border: 'none', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filters.status === key ? s.color : s.bg,
              color:      filters.status === key ? '#fff'   : s.color,
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          placeholder="Search customer or product..."
          value={filters.search}
          onChange={e => setF('search', e.target.value)}
          style={inputSm}
        />
        <select value={filters.status} onChange={e => setF('status', e.target.value)} style={inputSm}>
          <option value="">All Status</option>
          {Object.entries(STATUS_STYLE).map(([k, s]) => (
            <option key={k} value={k}>{s.label}</option>
          ))}
        </select>
        <input type="date" value={filters.from} onChange={e => setF('from', e.target.value)} style={inputSm} />
        <span style={{ alignSelf: 'center', fontSize: 12, color: '#64748b' }}>to</span>
        <input type="date" value={filters.to}   onChange={e => setF('to',   e.target.value)} style={inputSm} />
        <button onClick={() => setFilters({ search: '', status: '', from: '', to: '', page: 1 })} style={btnGhost}>
          Reset
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Customer','Product','Reason','Channel','Proof','Expiry Date','Status','Filed On','Actions'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={centerCell}>Loading warranty claims...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={centerCell}>No warranty claims found.</td></tr>
            ) : rows.map(r => {
              const ss = STATUS_STYLE[r.status] || { bg: '#f1f5f9', color: '#475569', label: r.status };

              // Expiry warning: red if expired, yellow if within 30 days
              const expiry      = r.warranty_expiry ? new Date(r.warranty_expiry) : null;
              const today       = new Date();
              const daysLeft    = expiry ? Math.ceil((expiry - today) / 86400000) : null;
              const expiryColor = daysLeft === null ? '#94a3b8'
                                : daysLeft < 0     ? '#dc2626'
                                : daysLeft <= 30   ? '#d97706'
                                :                    '#065f46';

              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{r.customer_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.customer_email}</div>
                  </td>
                  <td style={{ ...td, maxWidth: 160 }}>
                    <div style={{ fontWeight: 500 }}>{r.product_name}</div>
                  </td>
                  <td style={{ ...td, maxWidth: 180, fontSize: 12, color: '#64748b' }}>
                    {r.reason?.slice(0, 60)}{r.reason?.length > 60 ? '…' : ''}
                  </td>
                  <td style={td}>
                    <span style={{
                      background: r.order_channel === 'online' ? '#dbeafe' : '#dcfce7',
                      color:      r.order_channel === 'online' ? '#1e40af' : '#166534',
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>
                      {r.order_channel || '—'}
                    </span>
                  </td>
                  <td style={td}>
                    {r.proof_url
                      ? <a href={r.proof_url} target="_blank" rel="noreferrer" style={{ color: '#1e40af', fontSize: 12 }}>📎 View</a>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>
                    }
                  </td>
                  <td style={td}>
                    {expiry ? (
                      <div>
                        <div style={{ color: expiryColor, fontWeight: 600, fontSize: 12 }}>
                          {expiry.toLocaleDateString('en-PH')}
                        </div>
                        <div style={{ fontSize: 11, color: expiryColor }}>
                          {daysLeft < 0
                            ? 'Expired'
                            : daysLeft === 0
                              ? 'Expires today'
                              : `${daysLeft}d left`
                          }
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={td}>
                    <span style={{ background: ss.bg, color: ss.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {ss.label}
                    </span>
                    {r.replacement_receipt && (
                      <div style={{ marginTop: 4 }}>
                        <a href={r.replacement_receipt} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1e40af' }}>
                          📎 Receipt
                        </a>
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                    {new Date(r.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td style={td}>
                    {r.status === 'pending' && (
                      <button onClick={() => setModal({ row: r })} style={btnView}>
                        Review
                      </button>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => setModal({ row: r })} style={{ ...btnView, background: '#d1fae5', color: '#065f46' }}>
                        Fulfill
                      </button>
                    )}
                    {(r.status === 'rejected' || r.status === 'fulfilled') && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {r.fulfilled_by_name ? `by ${r.fulfilled_by_name}` : 'Closed'}
                      </span>
                    )}
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

      {/* ── Review / Fulfill Modal ───────────────────────────────── */}
      {modal && (
        <WarrantyModal
          row={modal.row}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Warranty Action Modal ─────────────────────────────────────────────────────
function WarrantyModal({ row, onClose, onSave }) {
  const isPending  = row.status === 'pending';
  const isApproved = row.status === 'approved';

  const [action,  setAction]  = useState(isPending ? 'approved' : 'fulfilled');
  const [receipt, setReceipt] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('status', action);
      if (receipt) fd.append('proof', receipt);

      await api.patch(`/warranty/${row.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(
        action === 'approved'  ? 'Warranty claim approved.' :
        action === 'rejected'  ? 'Warranty claim rejected.' :
        'Warranty fulfilled. Replacement receipt uploaded.'
      );
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modalBox}>
        {/* Claim Summary */}
        <h3 style={{ margin: '0 0 4px' }}>
          {isPending ? '🔍 Review Warranty Claim' : '✅ Fulfill Warranty Claim'}
        </h3>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>
          Filed by <strong>{row.customer_name}</strong>
        </p>

        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
          <InfoRow label="Product"      value={row.product_name} />
          <InfoRow label="Reason"       value={row.reason} />
          <InfoRow label="Filed On"     value={new Date(row.created_at).toLocaleDateString('en-PH')} />
          <InfoRow label="Expiry Date"  value={row.warranty_expiry ? new Date(row.warranty_expiry).toLocaleDateString('en-PH') : '—'} />
          {row.proof_url && (
            <div style={{ marginTop: 8 }}>
              <a href={row.proof_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#1e40af', textDecoration: 'underline' }}>
                📎 View Customer Proof
              </a>
            </div>
          )}
        </div>

        {/* Action for pending */}
        {isPending && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelSm}>Action</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={radioLabel}>
                <input type="radio" value="approved" checked={action === 'approved'} onChange={() => setAction('approved')} />
                ✓ Approve Claim
              </label>
              <label style={radioLabel}>
                <input type="radio" value="rejected" checked={action === 'rejected'} onChange={() => setAction('rejected')} />
                ✕ Reject Claim
              </label>
            </div>
          </div>
        )}

        {/* Replacement receipt for fulfillment */}
        {(isApproved || (isPending && action === 'approved')) && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelSm}>
              {isApproved
                ? 'Upload Replacement Receipt (required to mark as fulfilled) *'
                : 'Upload Replacement Receipt (optional — or fulfill later)'}
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setReceipt(e.target.files[0])}
              style={{ fontSize: 13 }}
            />
            {isApproved && (
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Uploading a receipt will mark this claim as <strong>Fulfilled</strong>.
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={action === 'rejected' ? btnDecline : btnPrimary}
          >
            {saving
              ? 'Saving...'
              : isApproved
                ? '✅ Mark as Fulfilled'
                : action === 'approved'
                  ? '✓ Approve Claim'
                  : '✕ Reject Claim'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#374151', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageTitle  = { fontSize: 22, fontWeight: 700, color: '#1e2a38', margin: 0 };
const card       = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' };
const th         = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td         = { padding: '11px 14px', color: '#374151', verticalAlign: 'middle' };
const centerCell = { textAlign: 'center', padding: 40, color: '#94a3b8' };
const inputSm    = { padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };
const labelSm    = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const radioLabel = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8 };
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = { background: '#fff', borderRadius: 12, padding: 28, width: 500, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const btnPrimary = { padding: '9px 22px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnGhost   = { padding: '9px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnDecline = { padding: '9px 22px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnView    = { padding: '4px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
