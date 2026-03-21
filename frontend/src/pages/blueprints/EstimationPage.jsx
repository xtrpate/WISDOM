// src/pages/blueprints/EstimationPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BLANK_ITEM = { name: '', quantity: 1, unit: 'pc', unit_cost: '', note: '' };

const formatMoney = (value) =>
  `₱ ${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const WOOD_FINISH_LABEL_MAP = {
  'oak-natural': 'Oak Natural',
  'pine-light': 'Pine Light',
  'maple-cream': 'Maple Cream',
  'beech-honey': 'Beech Honey',
  'walnut-dark': 'Walnut Dark',
  'mahogany-rich': 'Mahogany Rich',
  'teak-golden': 'Teak Golden',
  'ash-beige': 'Ash Beige',
};

const WOOD_FINISH_PRICE_MAP = {
  'oak-natural': 1.00,
  'pine-light': 0.92,
  'maple-cream': 1.08,
  'beech-honey': 1.05,
  'walnut-dark': 1.22,
  'mahogany-rich': 1.18,
  'teak-golden': 1.28,
  'ash-beige': 1.10,
};

const getWoodFinishMultiplier = (comp = {}) => {
  const finishId = String(comp?.finish || '').trim();

  if (finishId && WOOD_FINISH_PRICE_MAP[finishId]) {
    return Number(WOOD_FINISH_PRICE_MAP[finishId]) || 1;
  }

  const material = String(comp?.material || '').toLowerCase();

  if (material.includes('pine')) return 0.92;
  if (material.includes('oak')) return 1.0;
  if (material.includes('maple')) return 1.08;
  if (material.includes('beech')) return 1.05;
  if (material.includes('walnut')) return 1.22;
  if (material.includes('mahogany')) return 1.18;
  if (material.includes('teak')) return 1.28;
  if (material.includes('ash')) return 1.10;

  return 1;
};

const getWoodFinishLabel = (comp = {}) => {
  const finishId = String(comp?.finish || '').trim();
  return WOOD_FINISH_LABEL_MAP[finishId] || '';
};

const getMaterialDisplayName = (comp = {}) => {
  const finishLabel = getWoodFinishLabel(comp);
  const material = String(comp?.material || '—').trim() || '—';
  return finishLabel ? `${finishLabel} / ${material}` : material;
};

const normalizeItem = (raw = {}) => ({
  name: raw.name || raw.description || raw.label || '',
  quantity: Math.max(1, Number(raw.quantity ?? raw.qty ?? 1) || 1),
  unit: raw.unit || 'pc',
  unit_cost: Number(
    raw.unit_cost ??
      raw.unitCost ??
      raw.unit_price ??
      raw.unitPrice ??
      0
  ) || 0,
  note: raw.note || '',
});

const getDraftRows = (draft = {}) => {
  if (Array.isArray(draft?.rows)) return draft.rows;
  if (Array.isArray(draft?.lineItems)) return draft.lineItems;
  if (Array.isArray(draft?.line_items)) return draft.line_items;
  return [];
};

const getComponentVolume = (comp = {}) =>
  Math.max(1, Number(comp?.width) || 0) *
  Math.max(1, Number(comp?.height) || 0) *
  Math.max(1, Number(comp?.depth) || 0);

const getResolvedUnitPrice = (comp = {}, allComponents = []) => {
  const multiplier = getWoodFinishMultiplier(comp);

  const direct = Number(comp?.unitPrice) || 0;
  if (direct > 0) {
    return Number((direct * multiplier).toFixed(2));
  }

  const groupUnitPrice = Number(comp?.groupUnitPrice) || 0;
  if (!comp?.groupId || groupUnitPrice <= 0) return 0;

  const groupItems = allComponents.filter((c) => c.groupId === comp.groupId);
  const totalVolume = groupItems.reduce((sum, c) => sum + getComponentVolume(c), 0);

  if (!totalVolume) return 0;

  const allocatedBase = groupUnitPrice * (getComponentVolume(comp) / totalVolume);
  return Number((allocatedBase * multiplier).toFixed(2));
};



const buildAutoItemsFromComponents = (components = []) =>
  components.map((c) => {
    const finishLabel = getWoodFinishLabel(c);
    const materialLabel = getMaterialDisplayName(c);

    return normalizeItem({
      name: `${c.label || 'Component'}${finishLabel ? ` (${finishLabel})` : ''}`,
      quantity: Number(c.qty) || 1,
      unit: 'pc',
      unit_cost: getResolvedUnitPrice(c, components),
      note: `${materialLabel} · ${c.width || 0}×${c.height || 0}×${c.depth || 0} mm`,
    });
  });

export default function EstimationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [blueprint, setBlueprint] = useState(null);
  const [est, setEst] = useState(null);
  const [items, setItems] = useState([{ ...BLANK_ITEM }]);
  const [costs, setCosts] = useState({
    material_cost: 0,
    labor_cost: 0,
    overhead_cost: 0,
    tax_rate: 12,
    discount: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bpRes, estRes] = await Promise.all([
          api.get(`/blueprints/${id}`),
          api.get(`/blueprints/${id}/estimation`).catch(() => ({ data: null })),
        ]);

        setBlueprint(bpRes.data);

        if (estRes.data) {
          setEst(estRes.data);
          setItems(
            estRes.data.items?.length
              ? estRes.data.items.map(normalizeItem)
              : [{ ...BLANK_ITEM }]
          );
          setCosts({
            material_cost: estRes.data.material_cost || 0,
            labor_cost: estRes.data.labor_cost || 0,
            overhead_cost: estRes.data.overhead_cost || 0,
            tax_rate: estRes.data.tax_rate ?? 12,
            discount: estRes.data.discount || 0,
            notes: estRes.data.notes || '',
          });
          return;
        }

        let design = {};
        try {
          design =
            typeof bpRes.data.design_data === 'string'
              ? JSON.parse(bpRes.data.design_data || '{}')
              : bpRes.data.design_data || {};
        } catch {
          design = {};
        }

        const draftFromState = location.state?.estimateDraft;
        let draftFromStorage = null;
        try {
          draftFromStorage = JSON.parse(localStorage.getItem('wisdom_estimate_draft') || 'null');
        } catch {
          draftFromStorage = null;
        }

        const matchedDraft =
          [draftFromState, draftFromStorage].find((draft) => {
            const draftBlueprintId = String(draft?.blueprintId ?? draft?.blueprint_id ?? '');
            return draftBlueprintId === String(id);
          }) || null;

        const draftRows = getDraftRows(matchedDraft);

        if (draftRows.length) {
          setItems(draftRows.map(normalizeItem));
        } else {
          const autoItems = buildAutoItemsFromComponents(design.components || []);
          setItems(autoItems.length ? autoItems : [{ ...BLANK_ITEM }]);
        }
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || 'Failed to load estimation.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, location.state]);

  const addItem = () => setItems((prev) => [...prev, { ...BLANK_ITEM }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const setCost = (k, v) => setCosts((c) => ({ ...c, [k]: v }));

  const itemsTotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_cost || 0),
    0
  );
  const laborCost = Number(costs.labor_cost) || 0;
  const overheadCost = Number(costs.overhead_cost) || 0;
  const subtotal = itemsTotal + laborCost + overheadCost;
  const discount = Number(costs.discount) || 0;
  const afterDisc = subtotal - discount;
  const taxAmt = afterDisc * ((Number(costs.tax_rate) || 0) / 100);
  const grandTotal = afterDisc + taxAmt;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        items,
        ...costs,
        material_cost: itemsTotal,
        items_total: itemsTotal,
        subtotal,
        tax_amount: taxAmt,
        grand_total: grandTotal,
      };

      await api.post(`/blueprints/${id}/estimation`, payload);
      toast.success('Estimation saved. Blueprint advanced to estimation stage.');
      navigate(`/blueprints`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to save estimation.');
    } finally {
      setSaving(false);
    }
  };

    const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const bp = blueprint || {};
    const customer = bp.customer_name || bp.client_name || '—';
    const preparedDate = new Date().toLocaleDateString('en-PH');
    const reference = `BP-${String(id).padStart(4, '0')}`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const usableWidth = pageWidth - margin * 2;

    const blue = [28, 73, 170];
    const dark = [17, 24, 39];
    const text = [55, 65, 81];
    const muted = [107, 114, 128];
    const border = [218, 223, 230];
    const soft = [247, 249, 252];

    const money = (value) =>
      `PHP ${Number(value || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    // Top accent
    doc.setFillColor(...blue);
    doc.rect(0, 0, pageWidth, 8, 'F');

    // Header left
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Spiral Wood Services', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text('8 Sitio Laot, Prenza 1, Marilao, Bulacan', margin, 24);
    doc.text('spiralwoodservices.com', margin, 28);

    // Header right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...blue);
    doc.text('QUOTATION', pageWidth - margin, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...text);
    doc.text(`Reference No.: ${reference}`, pageWidth - margin, 25, { align: 'right' });
    doc.text(`Date: ${preparedDate}`, pageWidth - margin, 30, { align: 'right' });

    doc.setDrawColor(...blue);
    doc.setLineWidth(0.7);
    doc.line(margin, 34, pageWidth - margin, 34);

    // Bill-to and quotation meta
    const boxY = 40;
    const leftBoxW = 98;
    const rightBoxW = usableWidth - leftBoxW - 6;

    doc.setDrawColor(...border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, boxY, leftBoxW, 28, 2, 2, 'FD');
    doc.roundedRect(margin + leftBoxW + 6, boxY, rightBoxW, 28, 2, 2, 'FD');

    doc.setFillColor(...soft);
    doc.roundedRect(margin, boxY, leftBoxW, 9, 2, 2, 'F');
    doc.roundedRect(margin + leftBoxW + 6, boxY, rightBoxW, 9, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...dark);
    doc.text('CLIENT / PROJECT DETAILS', margin + 3, boxY + 6);
    doc.text('QUOTATION DETAILS', margin + leftBoxW + 9, boxY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...text);
    doc.text(`Blueprint: ${bp.title || '—'}`, margin + 3, boxY + 14);
    doc.text(`Customer: ${customer}`, margin + 3, boxY + 20);
    doc.text(`Document: Cost Estimation`, margin + 3, boxY + 26);

    const rightInfoX = margin + leftBoxW + 9;
    doc.text(`Validity: 30 days from quotation date`, rightInfoX, boxY + 14);
    doc.text(`Status: Draft Quotation`, rightInfoX, boxY + 20);
    doc.text(`Prepared by: Spiral Wood Services`, rightInfoX, boxY + 26);

    // Items table
    const tableStartY = 76;
    const bodyRows = items.length
      ? items.map((it, i) => {
          const qty = Number(it.quantity || 0);
          const unitCost = Number(it.unit_cost || 0);
          const amount = qty * unitCost;

          return [
            i + 1,
            it.note ? `${it.name || '—'}\n${it.note}` : it.name || '—',
            it.unit || 'pc',
            qty,
            money(unitCost),
            money(amount),
          ];
        })
      : [['1', 'No line items', '-', '-', money(0), money(0)]];

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['#', 'Description / Material', 'Unit', 'Qty', 'Unit Cost', 'Amount']],
      body: bodyRows,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: dark,
        lineColor: border,
        lineWidth: 0.2,
        cellPadding: 3,
        valign: 'middle',
      },
      headStyles: {
        fillColor: blue,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: soft,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 86 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.minCellHeight = 14;
        }
      },
    });

    let sectionTop = doc.lastAutoTable.finalY + 10;

    // Notes / terms box
    const notesX = margin;
    const notesW = 110;
    const summaryX = margin + notesW + 6;
    const summaryW = usableWidth - notesW - 6;

    const defaultNotes =
      'This quotation is subject to final confirmation of specifications, material availability, delivery schedule, and client approval. Any revisions or additional requests may affect the final cost.';
    const notesText = costs.notes?.trim() ? costs.notes.trim() : defaultNotes;
    const notesLines = doc.splitTextToSize(notesText, notesW - 8);
    const notesH = Math.max(46, 16 + notesLines.length * 4.6 + 8);

    doc.setDrawColor(...border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(notesX, sectionTop, notesW, notesH, 2, 2, 'FD');
    doc.setFillColor(...soft);
    doc.roundedRect(notesX, sectionTop, notesW, 10, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...dark);
    doc.text('NOTES / TERMS', notesX + 4, sectionTop + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...text);
    doc.text(notesLines, notesX + 4, sectionTop + 16);

    // Summary box
    const summaryRows = [
      ['Materials Subtotal', money(itemsTotal)],
      ['Labor / Fabrication', money(laborCost)],
      ['Overhead / Delivery', money(overheadCost)],
      ['Subtotal', money(subtotal)],
      ['Discount', `(${money(discount)})`],
      [`VAT (${Number(costs.tax_rate) || 0}%)`, money(taxAmt)],
    ];

    const rowGap = 8;
    const summaryH = 16 + summaryRows.length * rowGap + 18;

    doc.setDrawColor(...border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(summaryX, sectionTop, summaryW, summaryH, 2, 2, 'FD');
    doc.setFillColor(...soft);
    doc.roundedRect(summaryX, sectionTop, summaryW, 10, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...dark);
    doc.text('COST SUMMARY', summaryX + 4, sectionTop + 6.5);

    let rowY = sectionTop + 17;
    summaryRows.forEach(([label, value], idx) => {
      const isDiscount = idx === 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(isDiscount ? 220 : muted[0], isDiscount ? 38 : muted[1], isDiscount ? 38 : muted[2]);
      doc.text(label, summaryX + 4, rowY);

      doc.setTextColor(isDiscount ? 220 : dark[0], isDiscount ? 38 : dark[1], isDiscount ? 38 : dark[2]);
      doc.text(value, summaryX + summaryW - 4, rowY, { align: 'right' });

      if (idx !== summaryRows.length - 1) {
        doc.setDrawColor(...border);
        doc.line(summaryX + 4, rowY + 2.8, summaryX + summaryW - 4, rowY + 2.8);
      }

      rowY += rowGap;
    });

    doc.setFillColor(...blue);
    doc.roundedRect(summaryX, sectionTop + summaryH - 14, summaryW, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL', summaryX + 4, sectionTop + summaryH - 5);

    doc.setFontSize(12);
    doc.text(money(grandTotal), summaryX + summaryW - 4, sectionTop + summaryH - 5, {
      align: 'right',
    });

    // Signature section
    let sigY = Math.max(sectionTop + notesH, sectionTop + summaryH) + 24;
    if (sigY > pageHeight - 40) sigY = pageHeight - 40;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...dark);
    doc.text('Prepared by:', margin, sigY);
    doc.text('Accepted by:', 112, sigY);

    doc.setDrawColor(...blue);
    doc.setLineWidth(0.5);
    doc.line(margin, sigY + 16, 84, sigY + 16);
    doc.line(112, sigY + 16, pageWidth - margin, sigY + 16);

    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    doc.text('Authorized Representative / Signature / Date', margin, sigY + 22);
    doc.text('Client Signature / Date', 112, sigY + 22);

    // Footer
    doc.setDrawColor(...border);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`Generated on ${new Date().toLocaleString('en-PH')}`, margin, pageHeight - 8);
    doc.text(reference, pageWidth - margin, pageHeight - 8, { align: 'right' });

    doc.save(`quotation_${reference}_${Date.now()}.pdf`);
    toast.success('Quotation PDF exported.');
  };

  if (loading) return <div style={center}>Loading estimation...</div>;
  if (!blueprint) return <div style={center}>Blueprint not found.</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
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
          <button onClick={exportPDF} style={btnGhost}>📄 Export Quotation PDF</button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Saving...' : '💾 Save Estimation'}
          </button>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={sectionTitle}>📦 Line Items / Materials</h3>
          <button onClick={addItem} style={btnAdd}>+ Add Row</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Description / Material', 'Unit', 'Qty', 'Unit Cost (₱)', 'Total (₱)', 'Note', ''].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const rowTotal = Number(item.quantity || 0) * Number(item.unit_cost || 0);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, color: '#94a3b8', width: 32, fontWeight: 600 }}>{i + 1}</td>
                    <td style={td}>
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                        style={{ ...cellInput, width: 200 }}
                        placeholder="e.g. Plywood 3/4 inch"
                      />
                    </td>
                    <td style={td}>
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(i, 'unit', e.target.value)}
                        style={{ ...cellInput, width: 64 }}
                      >
                        {['pc', 'sheet', 'kg', 'm', 'ft', 'set', 'lot', 'L'].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        style={{ ...cellInput, width: 60 }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(i, 'unit_cost', e.target.value)}
                        style={{ ...cellInput, width: 100 }}
                        placeholder="0.00"
                      />
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: '#1e40af', width: 110 }}>
                      {formatMoney(rowTotal)}
                    </td>
                    <td style={td}>
                      <input
                        value={item.note}
                        onChange={(e) => updateItem(i, 'note', e.target.value)}
                        style={{ ...cellInput, width: 170 }}
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
                <td colSpan={5} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  Materials Subtotal
                </td>
                <td style={{ ...td, fontWeight: 700, color: '#1e40af', fontSize: 15 }}>
                  {formatMoney(itemsTotal)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={sectionTitle}>💰 Additional Costs</h3>
          </div>
          <div style={{ padding: 20 }}>
            {[
              { key: 'labor_cost', label: 'Labor / Fabrication Cost (₱)' },
              { key: 'overhead_cost', label: 'Overhead / Delivery (₱)' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={labelSm}>{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costs[key]}
                  onChange={(e) => setCost(key, e.target.value)}
                  style={inputFull}
                  placeholder="0.00"
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSm}>Discount (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costs.discount}
                  onChange={(e) => setCost('discount', e.target.value)}
                  style={inputFull}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={labelSm}>VAT Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={costs.tax_rate}
                  onChange={(e) => setCost('tax_rate', e.target.value)}
                  style={inputFull}
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelSm}>Notes / Remarks</label>
              <textarea
                value={costs.notes}
                onChange={(e) => setCost('notes', e.target.value)}
                rows={3}
                style={{ ...inputFull, resize: 'vertical' }}
                placeholder="Payment terms, delivery notes, inclusions/exclusions..."
              />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={sectionTitle}>🧾 Cost Summary</h3>
          </div>
          <div style={{ padding: 20 }}>
            {[
              { label: 'Materials Subtotal', val: itemsTotal, color: '#374151' },
              { label: 'Labor / Fabrication', val: laborCost, color: '#374151' },
              { label: 'Overhead / Delivery', val: overheadCost, color: '#374151' },
            ].map((row) => (
              <div key={row.label} style={summaryRow}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.color }}>{formatMoney(row.val)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />

            <div style={summaryRow}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{formatMoney(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div style={summaryRow}>
                <span style={{ color: '#dc2626', fontSize: 13 }}>Discount</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>({formatMoney(discount)})</span>
              </div>
            )}

            <div style={summaryRow}>
              <span style={{ color: '#64748b', fontSize: 13 }}>VAT ({costs.tax_rate}%)</span>
              <span style={{ fontWeight: 600 }}>{formatMoney(taxAmt)}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                background: '#1e40af',
                borderRadius: 10,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#bfdbfe', fontSize: 13, fontWeight: 600 }}>GRAND TOTAL</span>
              <span style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>
                {formatMoney(grandTotal)}
              </span>
            </div>

            {est && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#065f46',
                }}
              >
                ✅ Estimation previously saved on{' '}
                {new Date(est.updated_at || est.created_at).toLocaleDateString('en-PH')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 1px 6px rgba(0,0,0,.08)',
  overflow: 'hidden',
};
const center = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 300,
  color: '#64748b',
};
const sectionTitle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#1e2a38',
};
const th = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
};
const td = {
  padding: '8px 12px',
  color: '#374151',
  verticalAlign: 'middle',
};
const labelSm = {
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  display: 'block',
  marginBottom: 6,
};
const inputFull = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  boxSizing: 'border-box',
};
const cellInput = {
  padding: '6px 8px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  outline: 'none',
};
const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '7px 0',
  borderBottom: '1px solid #f8fafc',
};
const btnPrimary = {
  padding: '8px 20px',
  background: '#1e40af',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};
const btnGhost = {
  padding: '8px 16px',
  background: '#f1f5f9',
  color: '#374151',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};
const btnBack = {
  padding: '6px 14px',
  background: '#f1f5f9',
  color: '#374151',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};
const btnAdd = {
  padding: '6px 14px',
  background: '#dbeafe',
  color: '#1e40af',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};
const btnRemove = {
  padding: '3px 8px',
  background: '#fee2e2',
  color: '#dc2626',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};