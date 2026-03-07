// src/pages/blueprints/EstimationPage.jsx – Blueprint Cost Estimation (Admin)
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BLANK_ITEM = { name: '', quantity: 1, unit: 'pc', unit_cost: '', note: '' };

export default function EstimationPage() {
  const { id }     = useParams(); // blueprint id
  const navigate   = useNavigate();

  const [blueprint, setBlueprint] = useState(null);
  const [est,       setEst]       = useState(null);   // existing estimation if any
  const [items,     setItems]     = useState([{ ...BLANK_ITEM }]);
  const [costs,     setCosts]     = useState({ material_cost: 0, labor_cost: 0, overhead_cost: 0, tax_rate: 12, discount: 0, notes: '' });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/blueprints/${id}`),
      api.get(`/blueprints/${id}/estimation`).catch(() => ({ data: null })),
    ]).then(([bpRes, estRes]) => {
      setBlueprint(bpRes.data);
      if (estRes.data) {
        setEst(estRes.data);
        setItems(estRes.data.items?.length ? estRes.data.items : [{ ...BLANK_ITEM }]);
        setCosts({
          material_cost:  estRes.data.material_cost  || 0,
          labor_cost:     estRes.data.labor_cost     || 0,
          overhead_cost:  estRes.data.overhead_cost  || 0,
          tax_rate:       estRes.data.tax_rate       ?? 12,
          discount:       estRes.data.discount       || 0,
          notes:          estRes.data.notes          || '',
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const addItem = () => setItems(prev => [...prev, { ...BLANK_ITEM }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  const setCost = (k, v) => setCosts(c => ({ ...c, [k]: v }));

  // ── Calculations ──────────────────────────────────────────────────────────
  const itemsTotal   = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_cost || 0)), 0);
  const laborCost    = Number(costs.labor_cost)    || 0;
  const overheadCost = Number(costs.overhead_cost) || 0;
  const subtotal     = itemsTotal + laborCost + overheadCost;
  const discount     = Number(costs.discount) || 0;
  const afterDisc    = subtotal - discount;
  const taxAmt       = afterDisc * (Number(costs.tax_rate) / 100);
  const grandTotal   = afterDisc + taxAmt;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        items,
        ...costs,
        items_total:  itemsTotal,
        subtotal,
        tax_amount:   taxAmt,
        grand_total:  grandTotal,
      };
      await api.post(`/blueprints/${id}/estimation`, payload);
      toast.success('Estimation saved. Blueprint advanced to estimation stage.');
      navigate(`/blueprints`);
    } finally {
      setSaving(false);
    }
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    const bp  = blueprint || {};
    const customer = bp.customer_name || '—';
    const now = new Date().toLocaleDateString('en-PH');

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text('Spiral Wood Services', 105, 14, { align: 'center' });
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text('8 Sitio Laot, Prenza 1, Marilao, Bulacan  |  spiralwoodservices.com', 105, 20, { align: 'center' });

    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(14, 23, 196, 23);

    doc.setFontSize(14).setFont('helvetica', 'bold');
    doc.text('QUOTATION / COST ESTIMATION', 105, 31, { align: 'center' });

    // Meta
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text(`Blueprint:  ${bp.title || '—'}`, 14, 40);
    doc.text(`Customer:   ${customer}`,        14, 46);
    doc.text(`Date:       ${now}`,             14, 52);
    doc.text(`Reference:  BP-${String(id).padStart(5, '0')}`, 120, 40);
    doc.text(`Valid for:  30 days from date`,  120, 46);

    // Line items
    autoTable(doc, {
      startY: 60,
      head:   [['#', 'Description / Material', 'Unit', 'Qty', 'Unit Cost (₱)', 'Total (₱)']],
      body:   items.map((it, i) => [
        i + 1,
        it.note ? `${it.name}\n(${it.note})` : it.name,
        it.unit || 'pc',
        it.quantity,
        Number(it.unit_cost || 0).toFixed(2),
        (Number(it.quantity) * Number(it.unit_cost || 0)).toFixed(2),
      ]),
      styles:      { fontSize: 8 },
      headStyles:  { fillColor: [30, 64, 175] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 16 }, 3: { cellWidth: 12 }, 4: { cellWidth: 30 }, 5: { cellWidth: 30 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Cost summary
    const finalY = doc.lastAutoTable.finalY + 6;
    const summaryRows = [
      ['Materials Subtotal',            `₱ ${itemsTotal.toFixed(2)}`],
      ['Labor Cost',                    `₱ ${laborCost.toFixed(2)}`],
      ['Overhead / Delivery',           `₱ ${overheadCost.toFixed(2)}`],
      ['Subtotal',                      `₱ ${subtotal.toFixed(2)}`],
      [`Discount`,                      `(₱ ${discount.toFixed(2)})`],
      [`VAT (${costs.tax_rate}%)`,      `₱ ${taxAmt.toFixed(2)}`],
    ];

    autoTable(doc, {
      startY:    finalY,
      body:      summaryRows,
      styles:    { fontSize: 9 },
      tableWidth: 80,
      margin:    { left: 116 },
      columnStyles: { 0: { fontStyle: 'normal', textColor: [100, 116, 139] }, 1: { halign: 'right' } },
      theme:     'plain',
    });

    // Grand total box
    const gtY = doc.lastAutoTable.finalY + 2;
    doc.setFillColor(30, 64, 175);
    doc.rect(116, gtY, 80, 12, 'F');
    doc.setTextColor(255, 255, 255).setFontSize(10).setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', 120, gtY + 8);
    doc.text(`₱ ${grandTotal.toFixed(2)}`, 192, gtY + 8, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Notes
    if (costs.notes) {
      doc.setFontSize(9).setFont('helvetica', 'bold');
      doc.text('Notes:', 14, gtY + 4);
      doc.setFont('helvetica', 'normal');
      const split = doc.splitTextToSize(costs.notes, 90);
      doc.text(split, 14, gtY + 10);
    }

    // Signature block
    const sigY = Math.max(gtY + 30, doc.lastAutoTable?.finalY + 20 || 240);
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text('Prepared by:',            14,  sigY);
    doc.text('Accepted by:',            105, sigY);
    doc.line(14,  sigY + 14, 90,  sigY + 14);
    doc.line(105, sigY + 14, 186, sigY + 14);
    doc.text('Signature over Printed Name / Date', 14,  sigY + 18);
    doc.text('Customer Signature / Date',          105, sigY + 18);

    doc.save(`quotation_BP-${String(id).padStart(5, '0')}_${Date.now()}.pdf`);
    toast.success('Quotation PDF exported.');
  };

  if (loading) return <div style={center}>Loading estimation...</div>;
  if (!blueprint) return <div style={center}>Blueprint not found.</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/blueprints')} style={btnBack}>← Blueprints</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e2a38', margin: 0 }}>
            Cost Estimation — {blueprint.title}
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
            Blueprint #{String(id).padStart(5, '0')} · Customer: {blueprint.client_name || blueprint.customer_name || '—'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={exportPDF}   style={btnGhost}>📄 Export Quotation PDF</button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Saving...' : '💾 Save Estimation'}
          </button>
        </div>
      </div>

      {/* ── Line Items ───────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={sectionTitle}>📦 Line Items / Materials</h3>
          <button onClick={addItem} style={btnAdd}>+ Add Row</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Description / Material', 'Unit', 'Qty', 'Unit Cost (₱)', 'Total (₱)', 'Note', ''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const rowTotal = Number(item.quantity) * Number(item.unit_cost || 0);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, color: '#94a3b8', width: 32, fontWeight: 600 }}>{i + 1}</td>
                    <td style={td}>
                      <input
                        value={item.name}
                        onChange={e => updateItem(i, 'name', e.target.value)}
                        style={{ ...cellInput, width: 200 }}
                        placeholder="e.g. Plywood 3/4 inch"
                      />
                    </td>
                    <td style={td}>
                      <select value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} style={{ ...cellInput, width: 64 }}>
                        {['pc', 'sheet', 'kg', 'm', 'ft', 'set', 'lot', 'L'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="number" min="1" value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                        style={{ ...cellInput, width: 60 }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number" min="0" step="0.01" value={item.unit_cost}
                        onChange={e => updateItem(i, 'unit_cost', e.target.value)}
                        style={{ ...cellInput, width: 100 }}
                        placeholder="0.00"
                      />
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: '#1e40af', width: 110 }}>
                      ₱ {rowTotal.toFixed(2)}
                    </td>
                    <td style={td}>
                      <input
                        value={item.note}
                        onChange={e => updateItem(i, 'note', e.target.value)}
                        style={{ ...cellInput, width: 150 }}
                        placeholder="Optional note..."
                      />
                    </td>
                    <td style={td}>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} style={btnRemove}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0f4f8', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={5} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>Materials Subtotal</td>
                <td style={{ ...td, fontWeight: 700, color: '#1e40af', fontSize: 15 }}>
                  ₱ {itemsTotal.toFixed(2)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ── Additional Costs ────────────────────────────────────── */}
        <div style={card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={sectionTitle}>💰 Additional Costs</h3>
          </div>
          <div style={{ padding: 20 }}>
            {[
              { key: 'labor_cost',    label: 'Labor / Fabrication Cost (₱)' },
              { key: 'overhead_cost', label: 'Overhead / Delivery (₱)' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={labelSm}>{label}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={costs[key]}
                  onChange={e => setCost(key, e.target.value)}
                  style={inputFull}
                  placeholder="0.00"
                />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSm}>Discount (₱)</label>
                <input type="number" min="0" step="0.01" value={costs.discount} onChange={e => setCost('discount', e.target.value)} style={inputFull} placeholder="0.00" />
              </div>
              <div>
                <label style={labelSm}>VAT Rate (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={costs.tax_rate} onChange={e => setCost('tax_rate', e.target.value)} style={inputFull} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelSm}>Notes / Remarks</label>
              <textarea
                value={costs.notes}
                onChange={e => setCost('notes', e.target.value)}
                rows={3}
                style={{ ...inputFull, resize: 'vertical' }}
                placeholder="Payment terms, delivery notes, inclusions/exclusions..."
              />
            </div>
          </div>
        </div>

        {/* ── Cost Summary ─────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={sectionTitle}>🧾 Cost Summary</h3>
          </div>
          <div style={{ padding: 20 }}>
            {[
              { label: 'Materials Subtotal',          val: itemsTotal,   color: '#374151' },
              { label: 'Labor / Fabrication',         val: laborCost,    color: '#374151' },
              { label: 'Overhead / Delivery',         val: overheadCost, color: '#374151' },
            ].map(row => (
              <div key={row.label} style={summaryRow}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.color }}>₱ {row.val.toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />

            <div style={summaryRow}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>₱ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div style={summaryRow}>
                <span style={{ color: '#dc2626', fontSize: 13 }}>Discount</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>(₱ {discount.toFixed(2)})</span>
              </div>
            )}
            <div style={summaryRow}>
              <span style={{ color: '#64748b', fontSize: 13 }}>VAT ({costs.tax_rate}%)</span>
              <span style={{ fontWeight: 600 }}>₱ {taxAmt.toFixed(2)}</span>
            </div>

            {/* Grand Total */}
            <div style={{ marginTop: 16, background: '#1e40af', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#bfdbfe', fontSize: 13, fontWeight: 600 }}>GRAND TOTAL</span>
              <span style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>
                ₱ {grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {est && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#065f46' }}>
                ✅ Estimation previously saved on {new Date(est.updated_at || est.created_at).toLocaleDateString('en-PH')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const card        = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' };
const center      = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' };
const sectionTitle= { margin: 0, fontSize: 14, fontWeight: 700, color: '#1e2a38' };
const th          = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const td          = { padding: '8px 12px', color: '#374151', verticalAlign: 'middle' };
const labelSm     = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const inputFull   = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
const cellInput   = { padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none' };
const summaryRow  = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc' };
const btnPrimary  = { padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnGhost    = { padding: '8px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnBack     = { padding: '6px 14px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnAdd      = { padding: '6px 14px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnRemove   = { padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
