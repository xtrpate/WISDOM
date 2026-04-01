import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CalendarClock,
  Plus,
  UserCheck,
  CheckCircle2,
  Ban,
  Check,
} from "lucide-react";
import { useAuth } from "./PosAuthContext";
import useAuthStore from "../../store/authStore";

const PURPOSE_LABELS = {
  consultation: "Consultation",
  site_measurement: "Site Measurement",
  installation: "Installation",
};

const statusColor = (status) =>
  ({
    pending: "badge-yellow",
    confirmed: "badge-blue",
    done: "badge-green",
    cancelled: "badge-red",
  })[status] || "badge-gray";

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const humanizePurpose = (value) => {
  if (!value) return "—";
  return (
    PURPOSE_LABELS[value] ||
    String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

const parseNotes = (notes) => {
  const details = {
    projectDescription: "",
    contact: "",
    address: "",
    customerNotes: "",
    raw: "",
  };

  const lines = String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  details.raw = lines.join(" | ");

  lines.forEach((line) => {
    if (line.startsWith("Project Description:")) {
      details.projectDescription = line
        .replace("Project Description:", "")
        .trim();
    } else if (line.startsWith("Contact:")) {
      details.contact = line.replace("Contact:", "").trim();
    } else if (line.startsWith("Address:")) {
      details.address = line.replace("Address:", "").trim();
    } else if (line.startsWith("Customer Notes:")) {
      details.customerNotes = line.replace("Customer Notes:", "").trim();
    }
  });

  return details;
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d9d9d9",
  fontSize: 14,
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#444",
};

export default function AppointmentScheduling() {
  const { user } = useAuthStore();

  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    order_id: "",
    customer_id: "",
    purpose: "installation",
    scheduled_date: "",
    notes: "",
    assign_me_as_provider: false,
  });

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAppointments = async () => {
    try {
      const res = await axios.get("/api/pos/appointments");
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setAppointments([]);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const pendingRequests = useMemo(
    () => appointments.filter((a) => a.status === "pending"),
    [appointments],
  );

  const managedAppointments = useMemo(
    () => appointments.filter((a) => a.status !== "pending"),
    [appointments],
  );

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        order_id: form.order_id || undefined,
        customer_id: form.customer_id || undefined,
        purpose: form.purpose,
        scheduled_date: form.scheduled_date,
        preferred_date: form.scheduled_date,
        notes: form.notes.trim() || undefined,
        assign_me_as_provider: form.assign_me_as_provider,
      };

      const res = await axios.post("/api/pos/appointments", payload);

      setSuccess(
        `Appointment scheduled successfully.${
          res.data?.assigned_provider?.name
            ? ` Assigned provider: ${res.data.assigned_provider.name}`
            : ""
        }`,
      );

      setForm({
        order_id: "",
        customer_id: "",
        purpose: "installation",
        scheduled_date: "",
        notes: "",
        assign_me_as_provider: false,
      });

      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to schedule appointment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (appointmentId, payload, okMessage) => {
    setActionLoadingId(appointmentId);
    setError("");
    setSuccess("");

    try {
      const res = await axios.patch(
        `/api/pos/appointments/${appointmentId}`,
        payload,
      );
      setSuccess(okMessage || res.data?.message || "Appointment updated.");
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update appointment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="page-content">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Appointment Scheduling</h2>
          <p style={{ margin: "6px 0 0", color: "#666", fontSize: 14 }}>
            Professional flow: <strong>Handled By</strong> is the staff who
            processed the request, while <strong>Assigned Provider</strong> is
            the actual staff who will handle the appointment.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm((prev) => !prev);
            setError("");
            setSuccess("");
          }}
        >
          <Plus size={16} />
          {showForm ? "Close Manual Form" : "New Manual Appointment"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#fff1f0",
            color: "#b42318",
            border: "1px solid #fecdca",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#ecfdf3",
            color: "#027a48",
            border: "1px solid #abefc6",
            fontSize: 14,
          }}
        >
          {success}
        </div>
      ) : null}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3
            style={{
              marginBottom: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CalendarClock size={18} /> Manual Staff Appointment
          </h3>

          <form onSubmit={handleManualSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label style={labelStyle}>Order ID (optional)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  value={form.order_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, order_id: e.target.value }))
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>Customer ID (optional)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  value={form.customer_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customer_id: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>Purpose</label>
                <select
                  style={inputStyle}
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                >
                  <option value="installation">Installation</option>
                  <option value="consultation">Consultation</option>
                  <option value="site_measurement">Site Measurement</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Schedule</label>
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.scheduled_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduled_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: 96,
                  resize: "vertical",
                }}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes for this appointment"
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
                fontSize: 14,
                color: "#444",
              }}
            >
              <input
                type="checkbox"
                checked={form.assign_me_as_provider}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    assign_me_as_provider: e.target.checked,
                  }))
                }
              />
              Assign me as the provider/staff for this manual appointment
            </label>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: "#fafafa",
                border: "1px solid #eee",
                fontSize: 13,
                color: "#666",
              }}
            >
              <strong>Note:</strong> Manual appointments are recorded as
              confirmed. The logged-in staff becomes the{" "}
              <strong>Handled By</strong> user. Provider assignment is separate
              and optional.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                <Plus size={16} />
                {loading ? "Saving..." : "Save Appointment"}
              </button>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3
          style={{
            marginBottom: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CalendarClock size={18} /> Incoming Customer Requests
        </h3>

        {pendingRequests.length === 0 ? (
          <p
            style={{
              color: "#aaa",
              fontSize: 13,
              textAlign: "center",
              padding: 20,
            }}
          >
            No pending appointment requests.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Purpose</th>
                <th>Schedule</th>
                <th>Request Details</th>
                <th>Handled By</th>
                <th>Assigned Provider</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((a) => {
                const details = parseNotes(a.notes);

                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {a.customer_name || "Unlinked Customer"}
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {a.customer_phone || details.contact || "No contact"}
                      </div>
                    </td>

                    <td>{humanizePurpose(a.purpose)}</td>

                    <td style={{ fontSize: 12 }}>
                      {formatDateTime(a.scheduled_date)}
                    </td>

                    <td style={{ fontSize: 12, color: "#555", maxWidth: 280 }}>
                      {details.projectDescription && (
                        <div>
                          <strong>Project:</strong> {details.projectDescription}
                        </div>
                      )}
                      {details.address && (
                        <div>
                          <strong>Address:</strong> {details.address}
                        </div>
                      )}
                      {details.customerNotes && (
                        <div>
                          <strong>Notes:</strong> {details.customerNotes}
                        </div>
                      )}
                      {!details.projectDescription &&
                        !details.address &&
                        !details.customerNotes &&
                        (details.raw || "—")}
                    </td>

                    <td>
                      {a.handled_by_name ? (
                        <span>{a.handled_by_name}</span>
                      ) : (
                        <span style={{ color: "#aaa" }}>Unclaimed</span>
                      )}
                    </td>

                    <td>
                      {a.provider_name ? (
                        <span>{a.provider_name}</span>
                      ) : (
                        <span style={{ color: "#aaa" }}>Not assigned</span>
                      )}
                    </td>

                    <td>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                      >
                        {!a.handled_by_id && (
                          <button
                            className="btn btn-secondary"
                            disabled={actionLoadingId === a.id}
                            onClick={() =>
                              handleAction(
                                a.id,
                                { claim_request: true },
                                "Request claimed successfully.",
                              )
                            }
                          >
                            <UserCheck size={14} /> Claim Request
                          </button>
                        )}

                        {!a.provider_id && (
                          <button
                            className="btn btn-secondary"
                            disabled={actionLoadingId === a.id}
                            onClick={() =>
                              handleAction(
                                a.id,
                                { set_me_as_provider: true },
                                "You are now the assigned provider.",
                              )
                            }
                          >
                            <UserCheck size={14} /> Set Me as Provider
                          </button>
                        )}

                        <button
                          className="btn btn-primary"
                          disabled={actionLoadingId === a.id}
                          onClick={() =>
                            handleAction(
                              a.id,
                              { status: "confirmed" },
                              "Appointment confirmed.",
                            )
                          }
                        >
                          <CheckCircle2 size={14} /> Confirm
                        </button>

                        <button
                          className="btn btn-danger"
                          disabled={actionLoadingId === a.id}
                          onClick={() =>
                            handleAction(
                              a.id,
                              { status: "cancelled" },
                              "Appointment cancelled.",
                            )
                          }
                        >
                          <Ban size={14} /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3
          style={{
            marginBottom: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} /> Managed Appointments
        </h3>

        {managedAppointments.length === 0 ? (
          <p
            style={{
              color: "#aaa",
              fontSize: 13,
              textAlign: "center",
              padding: 20,
            }}
          >
            No confirmed or finished appointments yet.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Order #</th>
                <th>Purpose</th>
                <th>Schedule</th>
                <th>Handled By</th>
                <th>Assigned Provider</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {managedAppointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {a.customer_name || "Unlinked Customer"}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {a.customer_phone || "No contact"}
                    </div>
                  </td>

                  <td>
                    {a.order_number || <span style={{ color: "#aaa" }}>—</span>}
                  </td>
                  <td>{humanizePurpose(a.purpose)}</td>
                  <td style={{ fontSize: 12 }}>
                    {formatDateTime(a.scheduled_date)}
                  </td>

                  <td>
                    {a.handled_by_name || (
                      <span style={{ color: "#aaa" }}>—</span>
                    )}
                  </td>

                  <td>
                    {a.provider_name || (
                      <span style={{ color: "#aaa" }}>Not assigned</span>
                    )}
                  </td>

                  <td>
                    <span className={`badge ${statusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {a.status === "confirmed" && !a.provider_id && (
                        <button
                          className="btn btn-secondary"
                          disabled={actionLoadingId === a.id}
                          onClick={() =>
                            handleAction(
                              a.id,
                              { set_me_as_provider: true },
                              "You are now the assigned provider.",
                            )
                          }
                        >
                          <UserCheck size={14} /> Set Me as Provider
                        </button>
                      )}

                      {a.status === "confirmed" && (
                        <button
                          className="btn btn-secondary"
                          disabled={actionLoadingId === a.id}
                          onClick={() =>
                            handleAction(
                              a.id,
                              { status: "done" },
                              "Appointment marked as done.",
                            )
                          }
                        >
                          <Check size={14} /> Mark Done
                        </button>
                      )}

                      {a.status === "confirmed" && (
                        <button
                          className="btn btn-danger"
                          disabled={actionLoadingId === a.id}
                          onClick={() =>
                            handleAction(
                              a.id,
                              { status: "cancelled" },
                              "Appointment cancelled.",
                            )
                          }
                        >
                          <Ban size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
