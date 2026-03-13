/**
 * pages/appointmentpage.jsx
 * Book an Appointment page
 */
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  Clock,
  Phone,
  FileText,
  CheckCircle,
  ChevronDown,
  X,
} from "lucide-react";
import { useAuth } from "../context/authcontext";
import "./appointmentpage.css";

/* ── Minimum bookable date = tomorrow ── */
const getMinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    pending: { cls: "appt-badge-pending", label: "Pending" },
    confirmed: { cls: "appt-badge-confirmed", label: "Confirmed" },
    completed: { cls: "appt-badge-completed", label: "Completed" },
    cancelled: { cls: "appt-badge-cancelled", label: "Cancelled" },
  };
  const { cls, label } = map[status] || {
    cls: "appt-badge-pending",
    label: status,
  };
  return <span className={`appt-status-badge ${cls}`}>{label}</span>;
};

/* ── Time slots ── */
const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

const formatTime = (t) => {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const formatDate = (str) => {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (str) => {
  if (!str) return "—";
  const d = new Date(str);
  return (
    d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
  );
};

/* ════════════════════════════════════════
   Main Page
════════════════════════════════════════ */
export default function AppointmentPage() {
  const { user } = useAuth();

  /* Form state */
  const [purpose, setPurpose] = useState("");
  const [preferred_date, setPreferredDate] = useState("");
  const [preferred_time, setPreferredTime] = useState("");
  const [contact_number, setContactNumber] = useState(user?.phone || "");
  const [notes, setNotes] = useState("");

  /* UI state */
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  /* My appointments */
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await axios.get("/api/customer/appointments");
      setAppointments(res.data);
    } catch {
      // silently fail
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!purpose.trim()) return setError("Please describe your project.");
    if (!preferred_date) return setError("Please select a preferred date.");
    if (!preferred_time) return setError("Please select a preferred time.");
    if (!contact_number.trim())
      return setError("Please enter a contact number.");

    setSubmitting(true);
    try {
      await axios.post("/api/customer/appointments", {
        purpose: purpose.trim(),
        preferred_date,
        preferred_time,
        contact_number: contact_number.trim(),
        notes: notes.trim() || undefined,
      });
      setSubmitted(true);
      fetchAppointments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await axios.delete(`/api/customer/appointments/${id}`);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || "Could not cancel appointment.");
    }
  };

  const resetForm = () => {
    setPurpose("");
    setPreferredDate("");
    setPreferredTime("");
    setContactNumber(user?.phone || "");
    setNotes("");
    setSubmitted(false);
    setError("");
  };

  return (
    <div className="appt-page">
      {/* ── Hero ── */}
      <div className="appt-hero">
        <div className="appt-hero-text">
          <h1>Book an Appointment</h1>
          <p>
            Schedule a consultation with our team for your custom furniture
            project
          </p>
        </div>
      </div>

      <div className="appt-layout">
        {/* ── LEFT: Form or Success ── */}
        <div className="appt-form-col">
          <div className="appt-card">
            {submitted ? (
              /* ── Success state ── */
              <div className="appt-success">
                <div className="appt-success-icon">
                  <CheckCircle size={52} strokeWidth={1.5} />
                </div>
                <h2>Appointment Requested!</h2>
                <p>
                  Your appointment request has been submitted. Our team will
                  review it and get back to you to confirm the schedule.
                </p>
                <div className="appt-success-details">
                  <div className="appt-success-row">
                    <Calendar size={15} />
                    <span>{formatDate(preferred_date)}</span>
                  </div>
                  <div className="appt-success-row">
                    <Clock size={15} />
                    <span>{formatTime(preferred_time)}</span>
                  </div>
                  <div className="appt-success-row">
                    <FileText size={15} />
                    <span>{purpose}</span>
                  </div>
                </div>
                <button className="appt-btn-primary" onClick={resetForm}>
                  Book Another Appointment
                </button>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <div className="appt-card-header">
                  <h2>Appointment Details</h2>
                  <p>Fill in the form below and we'll confirm your schedule</p>
                </div>

                <form onSubmit={handleSubmit} className="appt-form">
                  {/* Project Description */}
                  <div className="appt-field">
                    <label className="appt-label">
                      <FileText size={14} /> Project Description{" "}
                      <span className="appt-required">*</span>
                    </label>
                    <textarea
                      className="appt-textarea"
                      placeholder="e.g. Kitchen cabinet set, 3-door wardrobe with mirror, floating shelves…"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className="appt-char-count">{purpose.length}/500</div>
                  </div>

                  {/* Date + Time */}
                  <div className="appt-row">
                    <div className="appt-field">
                      <label className="appt-label">
                        <Calendar size={14} /> Preferred Date{" "}
                        <span className="appt-required">*</span>
                      </label>
                      <input
                        type="date"
                        className="appt-input"
                        min={getMinDate()}
                        value={preferred_date}
                        onChange={(e) => setPreferredDate(e.target.value)}
                      />
                    </div>

                    <div className="appt-field">
                      <label className="appt-label">
                        <Clock size={14} /> Preferred Time{" "}
                        <span className="appt-required">*</span>
                      </label>
                      <div className="appt-time-grid">
                        {TIME_SLOTS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`appt-time-slot ${preferred_time === t ? "active" : ""}`}
                            onClick={() => setPreferredTime(t)}
                          >
                            {formatTime(t)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Contact Number */}
                  <div className="appt-field">
                    <label className="appt-label">
                      <Phone size={14} /> Contact Number{" "}
                      <span className="appt-required">*</span>
                    </label>
                    <input
                      type="tel"
                      className="appt-input"
                      placeholder="e.g. 09171234567"
                      value={contact_number}
                      onChange={(e) => setContactNumber(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  {/* Additional Notes */}
                  <div className="appt-field">
                    <label className="appt-label">
                      Additional Notes{" "}
                      <span className="appt-optional">(optional)</span>
                    </label>
                    <textarea
                      className="appt-textarea"
                      placeholder="Any extra details, dimensions, style preferences, or questions…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      maxLength={300}
                    />
                  </div>

                  {error && <div className="appt-error">{error}</div>}

                  <button
                    type="submit"
                    className="appt-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="appt-spinner" /> Submitting…
                      </>
                    ) : (
                      "Book Appointment"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info + My Appointments ── */}
        <div className="appt-info-col">
          {/* Info card */}
          <div className="appt-card appt-info-card">
            <h3>What to Expect</h3>
            <div className="appt-steps">
              <div className="appt-step">
                <div className="appt-step-num">1</div>
                <div>
                  <strong>Submit Request</strong>
                  <p>
                    Fill in the form with your project details and preferred
                    schedule.
                  </p>
                </div>
              </div>
              <div className="appt-step">
                <div className="appt-step-num">2</div>
                <div>
                  <strong>Admin Confirms</strong>
                  <p>
                    Our team reviews your request and confirms or suggests
                    another time.
                  </p>
                </div>
              </div>
              <div className="appt-step">
                <div className="appt-step-num">3</div>
                <div>
                  <strong>Consultation</strong>
                  <p>
                    Meet with our designers to discuss measurements, materials,
                    and pricing.
                  </p>
                </div>
              </div>
            </div>

            <div className="appt-hours">
              <div className="appt-hours-title">📅 Available Hours</div>
              <div className="appt-hours-row">
                <span>Monday – Friday</span>
                <span>8:00 AM – 5:00 PM</span>
              </div>
              <div className="appt-hours-row">
                <span>Saturday</span>
                <span>8:00 AM – 12:00 PM</span>
              </div>
              <div className="appt-hours-row closed">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
            </div>
          </div>

          {/* My Appointments */}
          <div className="appt-card">
            <h3 className="appt-my-title">My Appointments</h3>

            {loadingAppts ? (
              <div className="appt-loading">
                <div className="appt-spinner" /> Loading…
              </div>
            ) : appointments.length === 0 ? (
              <div className="appt-empty">
                <Calendar size={32} strokeWidth={1} />
                <p>No appointments yet</p>
              </div>
            ) : (
              <div className="appt-list">
                {appointments.map((a) => (
                  <div key={a.id} className="appt-item">
                    <div className="appt-item-top">
                      <div className="appt-item-purpose">{a.purpose}</div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="appt-item-meta">
                      <span>
                        <Calendar size={12} />{" "}
                        {formatDateTime(a.scheduled_date)}
                      </span>
                    </div>
                    {a.status === "pending" && (
                      <button
                        className="appt-btn-cancel"
                        onClick={() => handleCancel(a.id)}
                      >
                        <X size={12} /> Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
