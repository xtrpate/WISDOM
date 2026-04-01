// src/pages/blueprints/ContractsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

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

const formatCurrencyUI = (value) =>
  `₱ ${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCurrencyPdf = (value) =>
  `Php ${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH");
};

const formatDatePdf = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatPersonName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

function parseNumberedSections(text = "") {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) return [];

  const regex =
    /(^|\n)(\d+)\.\s*([A-Z][A-Z0-9 &/(),.-]+)\n([\s\S]*?)(?=\n\d+\.\s*[A-Z][A-Z0-9 &/(),.-]+\n|$)/g;

  const sections = [];
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    sections.push({
      number: match[2],
      title: match[3].trim(),
      body: match[4].trim(),
    });
  }

  if (sections.length) return sections;

  return [
    {
      number: "1",
      title: "TERMS AND CONDITIONS",
      body: normalized,
    },
  ];
}

function splitParagraphs(text = "") {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildWrappedParagraphs(doc, text = "", maxWidth = 170) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return [];

  return paragraphs.map((paragraph) => {
    const wrappedLines = [];

    paragraph.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();

      if (!line) {
        wrappedLines.push("");
        return;
      }

      wrappedLines.push(...doc.splitTextToSize(line, maxWidth));
    });

    return wrappedLines;
  });
}

function estimateTextBlockHeight(
  doc,
  text,
  maxWidth,
  lineHeight = 4,
  paragraphGap = 1.6
) {
  const paragraphs = buildWrappedParagraphs(doc, text, maxWidth);
  if (!paragraphs.length) return lineHeight;

  let height = 0;

  paragraphs.forEach((lines, index) => {
    height += Math.max(lines.length, 1) * lineHeight;
    if (index < paragraphs.length - 1) height += paragraphGap;
  });

  return height;
}

export default function ContractsPage() {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    order_id: "",
    blueprint_id: "",
    terms: DEFAULT_TERMS,
    warranty_terms: DEFAULT_WARRANTY,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [contractsRes, ordersRes] = await Promise.all([
        api.get("/contracts"),
        api.get("/orders", { params: { status: "confirmed", limit: 100 } }),
      ]);

      setContracts(Array.isArray(contractsRes.data) ? contractsRes.data : []);
      setOrders(Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : []);
    } catch (err) {
      toast.error("Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setF = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!form.order_id) {
      toast.error("Please select an order.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/contracts", form);
      toast.success("Contract generated. Order advanced to contract_released.");
      setModal(false);
      setForm({
        order_id: "",
        blueprint_id: "",
        terms: DEFAULT_TERMS,
        warranty_terms: DEFAULT_WARRANTY,
      });
      load();
    } catch (err) {
      toast.error("Failed to generate contract.");
    } finally {
      setSaving(false);
    }
  };

  const printContract = (c) => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const bottomLimit = pageHeight - 18;

      let y = 16;
      const customerDisplayName = formatPersonName(c.customer_name);

      const drawFrame = () => {
        doc.setDrawColor(45, 45, 45);
        doc.setLineWidth(0.6);
        doc.rect(4, 4, pageWidth - 8, pageHeight - 8);

        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.2);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      };

      const drawPageHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("PROJECT CONTRACT AGREEMENT", pageWidth / 2, y, {
          align: "center",
        });
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const introText = `This Contract Agreement is entered into by and between Spiral Wood Services and ${
          customerDisplayName || "the Customer"
        } under the terms and conditions stated below.`;
        const introLines = doc.splitTextToSize(introText, contentWidth - 26);
        doc.text(introLines, pageWidth / 2, y, { align: "center" });
        y += introLines.length * 3.9 + 6;
      };

      const addPage = () => {
        doc.addPage();
        drawFrame();
        y = 14;
      };

      const ensureSpace = (needed = 10) => {
        if (y + needed > bottomLimit) addPage();
      };

      const drawParagraphBlock = (
        text,
        x,
        maxWidth,
        lineHeight = 3.85,
        paragraphGap = 1.5,
        fontSize = 8.5
      ) => {
        const paragraphs = buildWrappedParagraphs(doc, text, maxWidth);

        if (!paragraphs.length) {
          y += lineHeight;
          return;
        }

        paragraphs.forEach((lines, index) => {
          const needed =
            Math.max(lines.length, 1) * lineHeight +
            (index < paragraphs.length - 1 ? paragraphGap : 0);

          ensureSpace(needed + 1);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(fontSize);

          if (lines.length) doc.text(lines, x, y);

          y += Math.max(lines.length, 1) * lineHeight;

          if (index < paragraphs.length - 1) y += paragraphGap;
        });
      };

      const drawSection = (number, title, body) => {
        const estimatedBodyHeight = estimateTextBlockHeight(
          doc,
          body,
          contentWidth,
          3.85,
          1.5
        );

        ensureSpace(5 + estimatedBodyHeight + 2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.6);
        doc.text(`${number}. ${title}`, margin, y);
        y += 5;

        drawParagraphBlock(body, margin, contentWidth, 3.85, 1.5, 8.5);
        y += 2.4;
      };

      const drawMiniSection = (title, rows, x, width, defaultLabelWidth = 28) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.3);
        doc.text(title, x, y);

        let rowY = y + 5;

        rows.forEach((row) => {
          const label = `${row.label}:`;
          const labelWidth = row.labelWidth ?? defaultLabelWidth;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.2);
          doc.text(label, x, rowY);

          if (row.line) {
            const lineStartX = x + labelWidth;
            const lineEndX = x + width - 2;

            doc.setDrawColor(90, 90, 90);
            doc.setLineWidth(0.25);
            doc.line(lineStartX, rowY, lineEndX, rowY);

            rowY += 4.6;
            return;
          }

          const value = row.value || "—";

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.2);
          const wrapped = doc.splitTextToSize(String(value), width - labelWidth);
          doc.text(wrapped, x + labelWidth, rowY);

          rowY += Math.max(wrapped.length, 1) * 3.55 + 1;
        });

        return rowY;
      };

      const terms = parseNumberedSections(c.terms || DEFAULT_TERMS);
      const warrantyText = c.warranty_terms || DEFAULT_WARRANTY;

      drawFrame();
      drawPageHeader();

      const leftX = margin;
      const rightX = 107;
      const colWidth = 82;

      const partiesRows = [
        { label: "Company Name", value: "Spiral Wood Services", labelWidth: 30 },
        {
          label: "Authorized Person / Project In-Charge",
          line: true,
          labelWidth: 63,
        },
        {
          label: "Customer Name",
          value: customerDisplayName || "____________________",
          labelWidth: 30,
        },
      ];

      const projectRows = [
        { label: "Contract No", value: `CNT-${String(c.id).padStart(5, "0")}`, labelWidth: 27 },
        { label: "Order No", value: `#${String(c.order_id).padStart(5, "0")}`, labelWidth: 27 },
        {
          label: "Blueprint Ref",
          value: c.blueprint_id
            ? `BP-${String(c.blueprint_id).padStart(5, "0")}`
            : "N/A",
          labelWidth: 27,
        },
        { label: "Date Issued", value: formatDatePdf(c.created_at), labelWidth: 27 },
        { label: "Total Amount", value: formatCurrencyPdf(c.total_amount || 0), labelWidth: 27 },
      ];

      ensureSpace(30);
      const leftEndY = drawMiniSection(
        "1. PARTIES INVOLVED",
        partiesRows,
        leftX,
        colWidth,
        30
      );
      const rightEndY = drawMiniSection(
        "2. PROJECT DETAILS",
        projectRows,
        rightX,
        colWidth,
        27
      );
      y = Math.max(leftEndY, rightEndY) + 4;

      terms.forEach((section, index) => {
        drawSection(index + 3, section.title, section.body);
      });

      drawSection(terms.length + 3, "WARRANTY", warrantyText);

      const signatureBlockHeight = 31;
      const authorizationHeight = 9;

      if (y + authorizationHeight + signatureBlockHeight > bottomLimit) {
        addPage();
      }

      drawSection(
        terms.length + 4,
        "AUTHORIZATION",
        "By signing below, both parties confirm their agreement to the terms stated in this contract."
      );

      ensureSpace(signatureBlockHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("SIGNATURES", pageWidth / 2, y, { align: "center" });
      y += 8;

      const sigLeftX = margin;
      const sigRightX = 110;
      const lineStartOffsetName = 13;
      const lineStartOffsetSig = 18;
      const lineStartOffsetDate = 11;
      const lineLength = 48;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.6);
      doc.text("Authorized Person / Project In-Charge", sigLeftX, y);
      doc.text("Customer", sigRightX, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setDrawColor(70, 70, 70);
      doc.setLineWidth(0.25);

      doc.text("Name:", sigLeftX, y);
      doc.line(sigLeftX + lineStartOffsetName, y, sigLeftX + lineLength, y);

      doc.text("Name:", sigRightX, y);
      doc.line(sigRightX + lineStartOffsetName, y, sigRightX + lineLength, y);
      y += 9;

      doc.text("Signature:", sigLeftX, y);
      doc.line(sigLeftX + lineStartOffsetSig, y, sigLeftX + lineLength, y);

      doc.text("Signature:", sigRightX, y);
      doc.line(sigRightX + lineStartOffsetSig, y, sigRightX + lineLength, y);
      y += 9;

      doc.text("Date:", sigLeftX, y);
      doc.line(sigLeftX + lineStartOffsetDate, y, sigLeftX + lineLength, y);

      doc.text("Date:", sigRightX, y);
      doc.line(sigRightX + lineStartOffsetDate, y, sigRightX + lineLength, y);

      doc.save(`contract_CNT-${String(c.id).padStart(5, "0")}.pdf`);
      toast.success("Contract PDF downloaded.");
    } catch (err) {
      toast.error("Failed to generate contract PDF.");
    }
  };

  const contractsThisMonth = contracts.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={pageTitle}>Contracts</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
            Generate and manage sales contracts for custom blueprint orders.
          </p>
        </div>

        <button onClick={() => setModal(true)} style={btnPrimary}>
          Generate Contract
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <SummaryCard
          label="Total Contracts"
          value={contracts.length}
          color="#3b82f6"
          icon="📝"
        />
        <SummaryCard
          label="This Month"
          value={contractsThisMonth}
          color="#10b981"
          icon="📅"
        />
      </div>

      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {[
                "Contract #",
                "Order #",
                "Customer",
                "Amount",
                "Blueprint",
                "Issued By",
                "Date Issued",
                "Actions",
              ].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={centerCell}>
                  Loading contracts...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={8} style={centerCell}>
                  No contracts generated yet.
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...td, fontWeight: 700, color: "#1e40af" }}>
                    CNT-{String(c.id).padStart(5, "0")}
                  </td>

                  <td style={td}>
                    <button
                      onClick={() => navigate(`/orders/${c.order_id}`)}
                      style={linkBtn}
                    >
                      #{String(c.order_id).padStart(5, "0")}
                    </button>
                  </td>

                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{c.customer_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {c.customer_email || ""}
                    </div>
                  </td>

                  <td style={{ ...td, fontWeight: 600 }}>
                    {c.total_amount ? formatCurrencyUI(c.total_amount) : "—"}
                  </td>

                  <td style={td}>
                    {c.blueprint_id ? (
                      <button
                        onClick={() =>
                          navigate(`/blueprints/${c.blueprint_id}/design`)
                        }
                        style={linkBtn}
                      >
                        BP-{String(c.blueprint_id).padStart(5, "0")}
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>

                  <td style={td}>{c.issued_by_name || "Admin"}</td>

                  <td style={{ ...td, fontSize: 12, color: "#64748b" }}>
                    {formatDate(c.created_at)}
                  </td>

                  <td style={td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => printContract(c)} style={btnPrint}>
                        Print
                      </button>
                      <button
                        onClick={() => navigate(`/orders/${c.order_id}`)}
                        style={btnView}
                      >
                        View Order
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: 640 }}>
            <h3 style={{ margin: "0 0 6px", color: "#111827" }}>
              Generate Sales Contract
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>
              Select the confirmed order, link a blueprint if available, and
              customize the contract terms before generating.
            </p>

            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelSm}>Order * (Confirmed orders only)</label>
                <select
                  required
                  value={form.order_id}
                  onChange={(e) => setF("order_id", e.target.value)}
                  style={inputFull}
                >
                  <option value="">— Select Order —</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{String(o.id).padStart(5, "0")} — {o.customer_name} —{" "}
                      {formatCurrencyUI(o.total_amount || 0)}
                    </option>
                  ))}
                </select>

                {orders.length === 0 && (
                  <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                    No confirmed orders found. Only confirmed orders can have
                    contracts generated.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelSm}>Blueprint ID (optional)</label>
                <input
                  type="number"
                  value={form.blueprint_id}
                  onChange={(e) => setF("blueprint_id", e.target.value)}
                  style={inputFull}
                  placeholder="Leave blank if no blueprint"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelSm}>Contract Terms & Conditions</label>
                <textarea
                  value={form.terms}
                  onChange={(e) => setF("terms", e.target.value)}
                  rows={8}
                  style={{
                    ...inputFull,
                    resize: "vertical",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelSm}>Warranty Terms</label>
                <textarea
                  value={form.warranty_terms}
                  onChange={(e) => setF("warranty_terms", e.target.value)}
                  rows={5}
                  style={{
                    ...inputFull,
                    resize: "vertical",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button type="button" onClick={() => setModal(false)} style={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={btnPrimary}>
                  {saving ? "Generating..." : "Generate Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        padding: "14px 20px",
        borderLeft: `4px solid ${color}`,
        boxShadow: "0 1px 6px rgba(0,0,0,.08)",
        minWidth: 150,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#1e2a38", margin: "4px 0 0" }}>
            {value}
          </p>
        </div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
    </div>
  );
}

const pageTitle = {
  fontSize: 22,
  fontWeight: 700,
  color: "#1e2a38",
  margin: 0,
};

const card = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 1px 6px rgba(0,0,0,.08)",
  overflow: "hidden",
};

const th = {
  textAlign: "left",
  padding: "11px 14px",
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
};

const td = {
  padding: "11px 14px",
  color: "#374151",
  verticalAlign: "middle",
};

const centerCell = {
  textAlign: "center",
  padding: 40,
  color: "#94a3b8",
};

const labelSm = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "block",
  marginBottom: 6,
};

const inputFull = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};

const modalBox = {
  background: "#fff",
  borderRadius: 14,
  padding: 28,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,.3)",
};

const btnPrimary = {
  padding: "9px 20px",
  background: "#1e40af",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const btnGhost = {
  padding: "9px 16px",
  background: "#f1f5f9",
  color: "#374151",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const btnPrint = {
  padding: "4px 12px",
  background: "#f3e8ff",
  color: "#6b21a8",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const btnView = {
  padding: "4px 12px",
  background: "#e0f2fe",
  color: "#0369a1",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const linkBtn = {
  background: "none",
  border: "none",
  color: "#1e40af",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
};