// src/pages/inventory/RawMaterialsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

const STOCK_COLORS = {
  in_stock: ["#d1fae5", "#065f46"],
  low_stock: ["#fef9c3", "#854d0e"],
  out_of_stock: ["#fee2e2", "#991b1b"],
};

export default function RawMaterialsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    page: 1,
  });
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data: {} }
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api.get("/inventory/raw", {
      params: { ...filters, limit: 20 },
    });
    setItems(data.rows || data); // Adjust based on your actual API response structure
    setTotal(data.total || data.length);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get("/suppliers").then((r) => setSuppliers(r.data));
  }, []);

  const openAdd = () =>
    setModal({
      mode: "add",
      data: {
        name: "",
        unit: "",
        quantity: 0,
        reorder_point: 0,
        unit_cost: 0,
        supplier_id: "",
      },
    });

  const openEdit = (item) => setModal({ mode: "edit", data: { ...item } });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await api.post("/inventory/raw", modal.data);
        toast.success("Raw material added.");
      } else {
        await api.put(`/inventory/raw/${modal.data.id}`, modal.data);
        toast.success("Raw material updated.");
      }
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this raw material?")) return;
    await api.delete(`/inventory/raw/${id}`);
    toast.success("Deleted.");
    load();
  };

  const setField = (k, v) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  return (
    <div style={{ padding: "20px" }}>
      <div style={header}>
        <h1 style={title}>Raw Materials Inventory</h1>
        <button onClick={openAdd} style={btnPrimary}>
          + Add product
        </button>
      </div>

      {/* Filters Section */}
      <div style={filtersContainer}>
        <div style={searchWrap}>
          {/* Replaced PNG with inline SVG to fix folder import error */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: 14 }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            placeholder="Search"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
            }
            style={inputRoundedSearch}
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))
          }
          style={inputRoundedSelect}
        >
          <option value="">Category: All</option>
          <option value="cosmetics">Wood Types</option>
          <option value="raw">Wood Parts</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
          }
          style={inputRoundedSelect}
        >
          <option value="">Status: All</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Main Table */}
      <div style={tableCard}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              {[
                "#",
                "Name",
                "Supplier",
                "Unit",
                "Qty",
                "Reorder Pt",
                "Unit Cost",
                "Total Value",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={h === "Actions" ? { ...th, textAlign: "right" } : th}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const [bg, color] = STOCK_COLORS[item.stock_status] || [
                "#fff",
                "#475569",
              ];

              return (
                <tr key={item.id} style={tr}>
                  <td style={tdMuted}>{index + 1}</td>
                  <td style={{ ...td, fontWeight: 500, color: "#1e293b" }}>
                    {item.name}
                  </td>
                  <td style={td}>{item.supplier_name || "—"}</td>
                  <td style={td}>{item.unit}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{item.quantity}</td>
                  <td style={td}>{item.reorder_point}</td>
                  <td style={{ ...td, color: "#059669" }}>
                    ${Number(item.unit_cost).toFixed(2)}
                  </td>
                  <td style={td}>
                    ${(item.quantity * item.unit_cost).toFixed(2)}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        ...pillStyle,
                        color: color !== "#475569" ? color : "#334155",
                        borderColor: color !== "#475569" ? bg : "#cbd5e1",
                      }}
                    >
                      {item.stock_status?.replace("_", " ") || "Unknown"} ▾
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button onClick={() => openEdit(item)} style={btnIcon}>
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ ...btnIcon, color: "#dc2626" }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={overlay}>
          <div style={modalBox}>
            <h3 style={{ margin: "0 0 20px", color: "#1e293b" }}>
              {modal.mode === "add" ? "Add Raw Material" : "Edit Raw Material"}
            </h3>
            <form onSubmit={handleSave}>
              {[
                ["Name *", "name", "text", true],
                ["Unit *", "unit", "text", true],
                ["Quantity", "quantity", "number"],
                ["Reorder Point", "reorder_point", "number"],
                ["Unit Cost ($)", "unit_cost", "number"],
              ].map(([label, key, type, req]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={labelSm}>{label}</label>
                  <input
                    type={type || "text"}
                    required={req}
                    value={modal.data[key] || ""}
                    onChange={(e) => setField(key, e.target.value)}
                    style={inputFull}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={labelSm}>Supplier</label>
                <select
                  value={modal.data.supplier_id || ""}
                  onChange={(e) => setField("supplier_id", e.target.value)}
                  style={inputFull}
                >
                  <option value="">None</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  style={btnGhost}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={btnPrimary}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable styles ──────────────────────────────────────────────────────────

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};
const title = { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 };

const filtersContainer = {
  display: "flex",
  gap: 12,
  marginBottom: 24,
  alignItems: "center",
};
const searchWrap = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};
const searchIcon = {
  position: "absolute",
  left: 14,
  fontSize: 13,
  color: "#94a3b8",
};

const inputRoundedSearch = {
  padding: "10px 16px 10px 38px",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  fontSize: 13,
  minWidth: 220,
  outline: "none",
  color: "#475569",
  background: "#fff",
};

const inputRoundedSelect = {
  padding: "10px 32px 10px 16px", // Increased right padding for arrow
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  fontSize: 13,
  minWidth: 160,
  outline: "none",
  color: "#475569",
  background: "#fff",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  // SVG background arrow
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "14px",
};

const tableCard = {
  background: "#fff",
  borderRadius: 16,
  padding: "10px 24px 24px",
  boxShadow: "0 4px 20px rgba(0,0,0,.03)",
};
const th = {
  textAlign: "left",
  padding: "16px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "1px solid #f1f5f9",
};
const tr = {
  borderBottom: "1px solid #f8fafc",
  transition: "background 0.2s ease",
};
const td = { padding: "18px 14px", color: "#475569", fontSize: 14 };
const tdMuted = { ...td, color: "#94a3b8", fontSize: 13 };

const pillStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  background: "#fff",
};

const btnPrimary = {
  padding: "10px 20px",
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  borderRadius: 20,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.5px",
};
const btnIcon = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  opacity: 0.6,
  padding: "4px 8px",
};

const inputFull = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
  outlineColor: "#4f46e5",
};
const labelSm = {
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  display: "block",
  marginBottom: 6,
};
const btnGhost = {
  padding: "10px 20px",
  background: "#f1f5f9",
  color: "#475569",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  backdropFilter: "blur(2px)",
};
const modalBox = {
  background: "#fff",
  borderRadius: 16,
  padding: 32,
  width: 480,
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,.25)",
};
