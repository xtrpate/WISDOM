import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";

const POLICY_STYLE = {
  full_refund: { bg: "#dcfce7", color: "#166534", label: "Full Refund" },
  processing_fee: { bg: "#fef3c7", color: "#a16207", label: "15% Fee Applied" },
  non_refundable: { bg: "#fee2e2", color: "#b91c1c", label: "Non-Refundable" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
};

const DECISION_STYLE = {
  pending: { bg: "#fef3c7", color: "#a16207", label: "Pending" },
  approved: { bg: "#dcfce7", color: "#166534", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
};

const getChannelMeta = (channel) => {
  const key = String(channel || "").toLowerCase();
  return key === "online"
    ? { label: "Online", bg: "#eff6ff", color: "#2563eb" }
    : { label: "Walk-in", bg: "#ecfdf5", color: "#15803d" };
};

const formatMoney = (value) =>
  `₱ ${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDecisionStatus = (row) => {
  const explicit = String(row?.decision_status || "").toLowerCase();
  if (explicit) return explicit;

  if (row?.approved_by == null) return "pending";
  if (String(row?.policy_applied || "").toLowerCase() === "rejected")
    return "rejected";
  return "approved";
};

export default function CancellationsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/orders/cancellations");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load cancellation requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const decision = getDecisionStatus(row);

      const matchesDecision = !decisionFilter || decision === decisionFilter;

      const haystack = [
        row.order_number,
        row.customer_name,
        row.requested_by_name,
        row.reason,
        row.policy_applied,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);

      return matchesDecision && matchesSearch;
    });
  }, [rows, search, decisionFilter]);

  const pageStats = useMemo(() => {
    const pendingCount = rows.filter(
      (row) => getDecisionStatus(row) === "pending",
    ).length;
    const approvedCount = rows.filter(
      (row) => getDecisionStatus(row) === "approved",
    ).length;
    const rejectedCount = rows.filter(
      (row) => getDecisionStatus(row) === "rejected",
    ).length;
    const totalRefund = rows
      .filter((row) => getDecisionStatus(row) === "approved")
      .reduce((sum, row) => sum + Number(row.refund_amount || 0), 0);

    return [
      { label: "Total Requests", value: rows.length },
      { label: "Pending Review", value: pendingCount },
      { label: "Approved", value: approvedCount },
      { label: "Rejected", value: rejectedCount },
      { label: "Refund Exposure", value: formatMoney(totalRefund) },
    ];
  }, [rows]);

  const activeFilterCount = [search, decisionFilter].filter(Boolean).length;

  const handleProcess = async ({ approved, refund_amount, policy_applied }) => {
    if (!modal?.row?.order_id) return;

    try {
      await api.post(`/orders/${modal.row.order_id}/cancellation`, {
        approved,
        refund_amount,
        policy_applied,
      });

      toast.success(
        approved ? "Cancellation approved." : "Cancellation rejected.",
      );
      setModal(null);
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to process cancellation request.",
      );
    }
  };

  return (
    <div style={pageShell}>
      <div style={headerBlock}>
        <div>
          <div style={eyebrow}>Sales & Orders</div>
          <h1 style={pageTitle}>Cancellations & Refunds</h1>
          <p style={pageSubtitle}>
            Review cancellation requests, apply the correct refund policy, and
            record the final decision.
          </p>
        </div>

        <div style={summaryPill}>{rows.length} total requests</div>
      </div>

      <div style={statsGrid}>
        {pageStats.map((stat) => (
          <div key={stat.label} style={statCard}>
            <div style={statLabel}>{stat.label}</div>
            <div style={statValue}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={policyNote}>
        <strong>Cancellation Policy:</strong> Standard orders cancelled before
        shipment → full refund. Custom blueprint orders cancelled after down
        payment but before contract release → 15% processing fee. After contract
        release → non-refundable. POS same-day void before leaving premises →
        full refund.
      </div>

      <div style={filterCard}>
        <div style={filterTopRow}>
          <input
            placeholder="Search order, customer, requester, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, ...searchInput }}
          />

          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            style={{ ...inputBase, minWidth: 170 }}
          >
            <option value="">All Decisions</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setDecisionFilter("");
            }}
            style={btnFilterGhost}
          >
            Reset Filters
          </button>
        </div>

        <div style={statusTabsRow}>
          <button
            onClick={() => setDecisionFilter("")}
            style={{
              ...statusTab,
              background: decisionFilter === "" ? "#0f172a" : "#f8fafc",
              color: decisionFilter === "" ? "#fff" : "#475569",
              border:
                decisionFilter === ""
                  ? "1px solid #0f172a"
                  : "1px solid #e2e8f0",
            }}
          >
            All
          </button>

          {Object.entries(DECISION_STYLE).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setDecisionFilter(key)}
              style={{
                ...statusTab,
                background: decisionFilter === key ? meta.color : meta.bg,
                color: decisionFilter === key ? "#fff" : meta.color,
                border: "none",
              }}
            >
              {meta.label}
            </button>
          ))}

          <div style={filtersMeta}>
            {activeFilterCount > 0
              ? `${activeFilterCount} active filter(s)`
              : "No active filters"}
          </div>
        </div>
      </div>

      <div style={tableCard}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>Cancellation Requests</h2>
            <p style={tableSubtitle}>
              Live cancellation records from your current system.
            </p>
          </div>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={theadRow}>
                {[
                  "Order",
                  "Customer",
                  "Requested By",
                  "Channel",
                  "Reason",
                  "Policy",
                  "Refund",
                  "Decision",
                  "Actions",
                ].map((header) => (
                  <th key={header} style={th}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={emptyCell}>
                    Loading cancellation requests...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={emptyCell}>
                    No cancellation requests found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const decision = getDecisionStatus(row);
                  const decisionMeta =
                    DECISION_STYLE[decision] || DECISION_STYLE.pending;

                  const policyKey =
                    String(row.policy_applied || "").toLowerCase() ||
                    (decision === "rejected" ? "rejected" : "");

                  const policyMeta = POLICY_STYLE[policyKey];
                  const channelMeta = getChannelMeta(row.channel);

                  return (
                    <tr key={row.id} style={bodyRow}>
                      <td style={td}>
                        <button
                          onClick={() => navigate(`/orders/${row.order_id}`)}
                          style={orderLink}
                        >
                          {row.order_number ||
                            `#${String(row.order_id).padStart(5, "0")}`}
                        </button>
                        <div style={secondaryText}>
                          Requested {formatDateTime(row.created_at)}
                        </div>
                      </td>

                      <td style={td}>
                        <div style={primaryText}>
                          {row.customer_name || "Customer"}
                        </div>
                        <div style={secondaryText}>
                          Order #{String(row.order_id).padStart(5, "0")}
                        </div>
                      </td>

                      <td style={td}>
                        <div style={primaryText}>
                          {row.requested_by_name || "Customer"}
                        </div>
                        <div style={secondaryText}>
                          {row.approved_by_name
                            ? `Processed by ${row.approved_by_name} · ${formatDateTime(row.approved_at)}`
                            : "Awaiting admin review"}
                        </div>
                      </td>

                      <td style={td}>
                        <span
                          style={{
                            ...pill,
                            background: channelMeta.bg,
                            color: channelMeta.color,
                          }}
                        >
                          {channelMeta.label}
                        </span>
                      </td>

                      <td style={td}>
                        <div style={reasonText}>
                          {row.reason || "No reason provided."}
                        </div>
                      </td>

                      <td style={td}>
                        {policyMeta ? (
                          <span
                            style={{
                              ...pill,
                              background: policyMeta.bg,
                              color: policyMeta.color,
                            }}
                          >
                            {policyMeta.label}
                          </span>
                        ) : (
                          <span style={secondaryText}>
                            {decision === "pending" ? "Pending review" : "—"}
                          </span>
                        )}
                      </td>

                      <td
                        style={{
                          ...td,
                          fontWeight: 700,
                          color:
                            Number(row.refund_amount || 0) > 0
                              ? "#166534"
                              : "#334155",
                        }}
                      >
                        {Number(row.refund_amount || 0) > 0
                          ? formatMoney(row.refund_amount)
                          : "—"}
                      </td>

                      <td style={td}>
                        <span
                          style={{
                            ...pill,
                            background: decisionMeta.bg,
                            color: decisionMeta.color,
                          }}
                        >
                          {decisionMeta.label}
                        </span>
                      </td>

                      <td style={td}>
                        <div style={actionsRow}>
                          <button
                            onClick={() => navigate(`/orders/${row.order_id}`)}
                            style={btnView}
                          >
                            View Order
                          </button>

                          {decision === "pending" && (
                            <button
                              onClick={() => setModal({ row })}
                              style={btnApprove}
                            >
                              Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ProcessModal
          row={modal.row}
          onClose={() => setModal(null)}
          onSubmit={handleProcess}
        />
      )}
    </div>
  );
}

function ProcessModal({ row, onClose, onSubmit }) {
  const initialPolicy = "full_refund";

  const [approved, setApproved] = useState(true);
  const [policy, setPolicy] = useState(initialPolicy);
  const [refund, setRefund] = useState(
    Number(row.total_amount || 0).toFixed(2),
  );

  const handlePolicyChange = (nextPolicy) => {
    setPolicy(nextPolicy);

    const total = Number(row.total_amount || 0);

    if (nextPolicy === "full_refund") setRefund(total.toFixed(2));
    if (nextPolicy === "processing_fee") setRefund((total * 0.85).toFixed(2));
    if (nextPolicy === "non_refundable") setRefund("0.00");
  };

  const handleSubmit = () => {
    const numericRefund = Number(refund || 0);

    if (approved) {
      if (Number.isNaN(numericRefund) || numericRefund < 0) {
        toast.error("Refund amount must be 0 or higher.");
        return;
      }

      onSubmit({
        approved: true,
        refund_amount: numericRefund,
        policy_applied: policy,
      });
      return;
    }

    onSubmit({
      approved: false,
      refund_amount: 0,
      policy_applied: "rejected",
    });
  };

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <h3 style={modalTitle}>Process Cancellation Request</h3>
        <p style={modalSubtitle}>
          {row.order_number ||
            `Order #${String(row.order_id).padStart(5, "0")}`}{" "}
          · Total {formatMoney(row.total_amount)}
        </p>

        <div style={infoPanel}>
          <div>
            <strong>Customer:</strong> {row.customer_name || "Customer"}
          </div>
          <div>
            <strong>Requested by:</strong> {row.requested_by_name || "Customer"}
          </div>
          <div>
            <strong>Requested on:</strong> {formatDateTime(row.created_at)}
          </div>
          <div>
            <strong>Reason:</strong> {row.reason || "No reason provided."}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelSm}>Decision</label>
          <div style={radioRow}>
            <label style={radioLabel}>
              <input
                type="radio"
                checked={approved}
                onChange={() => setApproved(true)}
              />
              Approve cancellation
            </label>

            <label style={radioLabel}>
              <input
                type="radio"
                checked={!approved}
                onChange={() => setApproved(false)}
              />
              Reject request
            </label>
          </div>
        </div>

        {approved && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSm}>Cancellation Policy</label>
              <select
                value={policy}
                onChange={(e) => handlePolicyChange(e.target.value)}
                style={inputFull}
              >
                <option value="full_refund">
                  Full Refund (before shipment)
                </option>
                <option value="processing_fee">15% Processing Fee</option>
                <option value="non_refundable">Non-Refundable</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelSm}>Refund Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                value={refund}
                readOnly
                style={{
                  ...inputFull,
                  background: "#f8fafc",
                  color: "#475569",
                }}
              />
              <div style={helperText}>
                Preview only. Final refund amount will be enforced by the server
                based on verified payment records.
              </div>
            </div>
          </>
        )}

        {!approved && (
          <div style={rejectNote}>
            This request will be marked as rejected. The related order will stay
            in its current status.
          </div>
        )}

        <div style={modalActions}>
          <button onClick={onClose} style={btnGhost}>
            Close
          </button>
          <button
            onClick={handleSubmit}
            style={approved ? btnPrimary : btnDeclineAction}
          >
            {approved ? "Approve & Process" : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

const pageShell = {
  maxWidth: 1180,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const headerBlock = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
};

const eyebrow = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#64748b",
  marginBottom: 8,
};

const pageTitle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 700,
  color: "#0f172a",
};

const pageSubtitle = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.55,
  maxWidth: 620,
};

const summaryPill = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "#0f172a",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const statCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: "12px 14px",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.028)",
};

const statLabel = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#94a3b8",
  marginBottom: 8,
};

const statValue = {
  fontSize: 22,
  fontWeight: 700,
  color: "#0f172a",
  lineHeight: 1,
};

const policyNote = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 13,
  lineHeight: 1.6,
  color: "#92400e",
};

const filterCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 14,
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.035)",
};

const filterTopRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 12,
};

const inputBase = {
  height: 40,
  padding: "0 13px",
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  background: "#fff",
  fontSize: 12,
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
};

const searchInput = {
  flex: "1 1 320px",
  minWidth: 260,
};

const btnFilterGhost = {
  height: 40,
  padding: "0 14px",
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  background: "#f8fafc",
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const statusTabsRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const statusTab = {
  padding: "7px 11px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const filtersMeta = {
  marginLeft: "auto",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 600,
};

const tableCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "16px 18px 8px",
};

const tableTitle = {
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: "#0f172a",
};

const tableSubtitle = {
  margin: "4px 0 0",
  fontSize: 11,
  color: "#64748b",
};

const tableWrap = {
  width: "100%",
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 1180,
};

const theadRow = {
  background: "#f8fafc",
};

const th = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748b",
  borderBottom: "1px solid #edf2f7",
};

const td = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#334155",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const bodyRow = {
  background: "#ffffff",
};

const emptyCell = {
  textAlign: "center",
  padding: "42px 20px",
  color: "#94a3b8",
  fontSize: 13,
};

const orderLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const primaryText = {
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 4,
};

const secondaryText = {
  fontSize: 12,
  color: "#94a3b8",
};

const reasonText = {
  maxWidth: 240,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#334155",
};

const pill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const actionsRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const btnView = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnApprove = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #a7f3d0",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};

const modalBox = {
  width: "100%",
  maxWidth: 560,
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
};

const modalTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
};

const modalSubtitle = {
  margin: "6px 0 18px",
  fontSize: 13,
  color: "#64748b",
};

const infoPanel = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  fontSize: 13,
  color: "#334155",
  lineHeight: 1.7,
  marginBottom: 18,
};

const labelSm = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  display: "block",
  marginBottom: 8,
};

const radioRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 18,
};

const radioLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
  cursor: "pointer",
};

const inputFull = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 13,
  boxSizing: "border-box",
};

const helperText = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 6,
};

const rejectNote = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 12,
  padding: 12,
  fontSize: 13,
  color: "#b91c1c",
  marginBottom: 18,
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const btnGhost = {
  padding: "10px 16px",
  background: "#f1f5f9",
  color: "#374151",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const btnPrimary = {
  padding: "10px 16px",
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const btnDeclineAction = {
  padding: "10px 16px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};
