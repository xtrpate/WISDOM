// src/pages/blueprints/ContractsPage.jsx – Contracts Management (Admin)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const DEFAULT_TERMS = `1. SCOPE OF WORK
The contractor agrees to fabricate and deliver the custom woodwork as described in the approved blueprint and cost estimation attached to this contract.

2. PAYMENT TERMS
A down payment of 50% of the total contract price is required before fabrication begins. The remaining balance is due upon delivery and acceptance of the finished product.

3. DELIVERY & INSTALLATION
The estimated completion and delivery date will be agreed upon after the down payment is received. Delays caused by customer changes or force majeure will extend the timeline accordingly.

4. CHANGES & REVISIONS
Any changes to the approved design after fabrication has begun may incur additional charges and timeline adjustments, subject to mutual agreement.

5. OWNERSHIP
Ownership of the finished product transfers to the customer upon full payment of the contract price.

6. GOVERNING LAW
This contract shall be governed by the laws of the Republic of the Philippines.`;

const DEFAULT_WARRANTY = `This product is covered by a one (1) year warranty from the date of delivery against defects in materials and workmanship under normal use conditions.

Warranty does not cover damage caused by misuse, neglect, unauthorized modifications, or external causes such as accidents or natural disasters.

To file a warranty claim, contact Spiral Wood Services with proof of purchase and documentation of the defect.`;

export default function ContractsPage() {
  const navigate             = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [orders,    setOrders]    = useState([]);   // for dropdown
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({
    order_id:        '',
    blueprint_id:    '',
    terms:           DEFAULT_TERMS,
    warranty_terms:  DEFAULT_WARRANTY,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [contractsRes, ordersRes] = await Promise.all([
        api.get('/contracts'),
        api.get('/orders', { params: { status: 'confirmed', limit: 100 } }),
      ]);
      setContracts(contractsRes.data);
      setOrders(ordersRes.data.orders || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.order_id) { toast.error('Please select an order.'); return; }
    setSaving(true);
    try {
      await api.post('/contracts', form);
      toast.success('Contract generated. Order advanced to contract_released.');
      setModal(false);
      setForm({ order_id: '', blueprint_id: '', terms: DEFAULT_TERMS, warranty_terms: DEFAULT_WARRANTY });
      load();
    } finally {
      setSaving(false);
    }
  };

  // ── Print a contract to PDF ───────────────────────────────────────────────
  const printContract = (c) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text('Spiral Wood Services', 105, 16, { align: 'center' });
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text('8 Sitio Laot, Prenza 1, Marilao, Bulacan', 105, 22, { align: 'center' });

    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(14, 26, 196, 26);

    doc.setFontSize(15).setFont('helvetica', 'bold');
    doc.text('SALES CONTRACT', 105, 34, { align: 'center' });

    // Parties
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text(`Contract No.:  CNT-${String(c.id).padStart(5, '0')}`, 14, 44);
    doc.text(`Order No.:     #${String(c.order_id).padStart(5, '0')}`, 14, 50);
    doc.text(`Customer:      ${c.customer_name || '—'}`, 14, 56);
    doc.text(`Date Issued:   ${new Date(c.created_at).toLocaleDateString('en-PH')}`, 120, 44);
    doc.text(`Total Amount:  ₱ ${Number(c.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 120, 50);

    // Terms
    doc.setLineWidth(0.3);
    doc.line(14, 62, 196, 62);
    doc.setFontSize(10).setFont('helvetica', 'bold');
    doc.text('TERMS AND CONDITIONS', 14, 70);
    doc.setFontSize(8).setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(c.terms || DEFAULT_TERMS, 178);
    doc.text(termsLines, 14, 76);

    // Warranty
    const warrantyY = 76 + termsLines.length * 4 + 6;
    doc.setFontSize(10).setFont('helvetica', 'bold');
    doc.text('WARRANTY TERMS', 14, warrantyY);
    doc.setFontSize(8).setFont('helvetica', 'normal');
    const wLines = doc.splitTextToSize(c.warranty_terms || DEFAULT_WARRANTY, 178);
    doc.text(wLines, 14, warrantyY + 6);

    // Signature block
    const sigY = Math.min(warrantyY + wLines.length * 4 + 18, 248);
    doc.line(14, sigY, 80, sigY);
    doc.line(120, sigY, 196, sigY);
    doc.setFontSize(8);
    doc.text('Authorized Signatory / Owner',     14,  sigY + 4);
    doc.text('Customer Signature over Printed Name', 120, sigY + 4);
    doc.text('Date: ________________________',   14,  sigY + 10);
    doc.text('Date: ________________________',   120, sigY + 10);

    doc.save(`contract_CNT-${String(c.id).padStart(5, '0')}.pdf`);
    toast.success('Contract PDF downloaded.');
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>Contracts</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Generate and manage sales contracts for custom blueprint orders.
          </p>
        </div>
        <button onClick={() => setModal(true)} style={btnPrimary}>📝 Generate Contract</button>
      </div>

      {/* ── Summary ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="Total Contracts" value={contracts.length} color="#3b82f6" icon="📝" />
        <SummaryCard label="This Month"
          value={contracts.filter(c => new Date(c.created_at).getMonth() === new Date().getMonth()).length}
          color="#10b981" icon="📅"
        />
      </div>

      {/* ── Contracts Table ──────────────────────────────────────── */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Contract #', 'Order #', 'Customer', 'Amount', 'Blueprint', 'Issued By', 'Date Issued', 'Actions'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={centerCell}>Loading contracts...</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={8} style={centerCell}>No contracts generated yet.</td></tr>
            ) : contracts.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 700, color: '#1e40af' }}>
                  CNT-{String(c.id).padStart(5, '0')}
                </td>
                <td style={td}>
                  <button onClick={() => navigate(`/orders/${c.order_id}`)} style={linkBtn}>
                    #{String(c.order_id).padStart(5, '0')}
                  </button>
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{c.customer_name || '—'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.customer_email || ''}</div>
                </td>
                <td style={{ ...td, fontWeight: 600 }}>
                  {c.total_amount
                    ? `₱ ${Number(c.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : '—'
                  }
                </td>
                <td style={td}>
                  {c.blueprint_id
                    ? <button onClick={() => navigate(`/blueprints/${c.blueprint_id}/design`)} style={linkBtn}>
                        BP-{String(c.blueprint_id).padStart(5, '0')}
                      </button>
                    : <span style={{ color: '#94a3b8' }}>—</span>
                  }
                </td>
                <td style={td}>{c.issued_by_name || 'Admin'}</td>
                <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                  {new Date(c.created_at).toLocaleDateString('en-PH')}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => printContract(c)} style={btnPrint}>🖨 Print</button>
                    <button onClick={() => navigate(`/orders/${c.order_id}`)} style={btnView}>View Order</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Generate Contract Modal ───────────────────────────────── */}
      {modal && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: 640 }}>
            <h3 style={{ margin: '0 0 6px' }}>📝 Generate Sales Contract</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>
              Select the confirmed order, link a blueprint (optional), and customize the contract terms before generating.
            </p>
            <form onSubmit={handleGenerate}>
              {/* Order select */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelSm}>Order * (Confirmed orders only)</label>
                <select required value={form.order_id} onChange={e => setF('order_id', e.target.value)} style={inputFull}>
                  <option value="">— Select Order —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      #{String(o.id).padStart(5,'0')} — {o.customer_name} — ₱{Number(o.total_amount).toFixed(2)}
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                    No confirmed orders found. Only confirmed orders can have contracts generated.
                  </p>
                )}
              </div>

              {/* Blueprint ID (optional) */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelSm}>Blueprint ID (optional)</label>
                <input
                  type="number" value={form.blueprint_id}
                  onChange={e => setF('blueprint_id', e.target.value)}
                  style={inputFull}
                  placeholder="Leave blank if no blueprint"
                />
              </div>

              {/* Terms */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelSm}>Contract Terms & Conditions</label>
                <textarea
                  value={form.terms}
                  onChange={e => setF('terms', e.target.value)}
                  rows={8}
                  style={{ ...inputFull, resize: 'vertical', fontSize: 12, lineHeight: 1.6 }}
                />
              </div>

              {/* Warranty terms */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelSm}>Warranty Terms</label>
                <textarea
                  value={form.warranty_terms}
                  onChange={e => setF('warranty_terms', e.target.value)}
                  rows={5}
                  style={{ ...inputFull, resize: 'vertical', fontSize: 12, lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(false)} style={btnGhost}>Cancel</button>
                <button type="submit" disabled={saving} style={btnPrimary}>
                  {saving ? 'Generating...' : '📝 Generate Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', borderLeft: `4px solid ${color}`, boxShadow: '0 1px 6px rgba(0,0,0,.08)', minWidth: 150 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>{label}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1e2a38', margin: '4px 0 0' }}>{value}</p>
        </div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageTitle  = { fontSize: 22, fontWeight: 700, color: '#1e2a38', margin: 0 };
const card       = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' };
const th         = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td         = { padding: '11px 14px', color: '#374151', verticalAlign: 'middle' };
const centerCell = { textAlign: 'center', padding: 40, color: '#94a3b8' };
const labelSm    = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const inputFull  = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = { background: '#fff', borderRadius: 12, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const btnPrimary = { padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnGhost   = { padding: '8px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnPrint   = { padding: '4px 12px', background: '#f3e8ff', color: '#6b21a8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnView    = { padding: '4px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const linkBtn    = { background: 'none', border: 'none', color: '#1e40af', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
