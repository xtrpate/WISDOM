/**
 * pages/customcheckoutpage.jsx
 * Submit a custom order with delivery info
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Scissors, CheckCircle, ArrowRight } from "lucide-react";
import { useCustomCart } from "./customcartcontext";
import "./customizepage.css";
import useAuthStore from "../../store/authStore";

const PAYMENT_METHODS = [
  {
    value: "cod",
    icon: "💵",
    label: "Cash on Delivery",
    desc: "Pay when your order arrives",
  },
  {
    value: "cop",
    icon: "🏪",
    label: "Cash on Pick-up",
    desc: "Pay when you pick up your order",
  },
  {
    value: "gcash",
    icon: "📱",
    label: "GCash",
    desc: "Send payment via GCash",
  },
  {
    value: "bank_transfer",
    icon: "🏦",
    label: "Bank Transfer",
    desc: "Transfer to our bank account",
  },
];

export default function CustomCheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { customCart, clearCustomCart } = useCustomCart();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    delivery_address: user?.address || "",
    payment_method: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!customCart || customCart.length === 0) navigate("/custom-cart");
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please enter your full name.");
    if (!form.phone.trim()) return setError("Please enter your phone number.");
    if (!form.payment_method)
      return setError("Please select a payment method.");

    setLoading(true);
    try {
      await axios.post("/api/customer/custom-orders", {
        items: customCart,
        name: form.name,
        phone: form.phone,
        delivery_address: form.delivery_address,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      clearCustomCart();
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <div className="page-hero">
          <h1>Custom Order Submitted! 🎉</h1>
        </div>
        <div className="order-success">
          <div className="order-success-icon">✅</div>
          <h2>Thank you, {user?.name?.split(" ")[0]}!</h2>
          <p>
            Your custom order has been submitted. Our team will review your
            specifications and contact you to confirm pricing and schedule.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => navigate("/orders")}
            >
              View My Orders
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/customize")}
            >
              Customize More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="page-hero"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1>Custom Order Checkout</h1>
          <p>Review your custom items and fill in your details</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/custom-cart")}
        >
          ← Back to Cart
        </button>
      </div>

      <div className="checkout-layout">
        {/* Left: form */}
        <div className="checkout-form-panel">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Items review */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div
                className="checkout-section-num"
                style={{
                  background: "linear-gradient(135deg,#2d6a4f,#52b788)",
                  fontSize: 13,
                }}
              >
                ✂️
              </div>
              <h3>Your Custom Items</h3>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>
                {customCart.length} item{customCart.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="checkout-items-preview">
              {customCart.map((item) => (
                <div key={item.key} className="checkout-item-row">
                  <div className="checkout-item-thumb">
                    {item.image_url ? (
                      <img
                        src={`http://localhost:5000/${item.image_url}`}
                        alt={item.product_name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          fontSize: 20,
                        }}
                      >
                        🪵
                      </div>
                    )}
                  </div>
                  <div className="checkout-item-details">
                    <div className="checkout-item-name">
                      {item.product_name}
                    </div>
                    <div className="custom-cart-specs" style={{ marginTop: 4 }}>
                      {item.wood_type && (
                        <span className="custom-spec-tag">
                          🪵 {item.wood_type}
                        </span>
                      )}
                      {item.color && (
                        <span className="custom-spec-tag">🎨 {item.color}</span>
                      )}
                      {item.door_style && (
                        <span className="custom-spec-tag">
                          🚪 {item.door_style}
                        </span>
                      )}
                      {item.hardware && (
                        <span className="custom-spec-tag">
                          🔩 {item.hardware}
                        </span>
                      )}
                      {(item.width || item.height || item.depth) && (
                        <span className="custom-spec-tag">
                          📐{" "}
                          {[
                            item.width && `W${item.width}`,
                            item.height && `H${item.height}`,
                            item.depth && `D${item.depth}`,
                          ]
                            .filter(Boolean)
                            .join(" × ")}{" "}
                          cm
                        </span>
                      )}
                    </div>
                    {item.comments && (
                      <div
                        className="checkout-item-sub"
                        style={{ marginTop: 4 }}
                      >
                        💬 {item.comments}
                      </div>
                    )}
                  </div>
                  <div className="checkout-item-qty">×{item.quantity}</div>
                  <div
                    className="checkout-item-price"
                    style={{ fontSize: 12, color: "#aaa" }}
                  >
                    TBD
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Info */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div className="checkout-section-num">1</div>
              <h3>Delivery Information</h3>
            </div>
            <div className="checkout-section-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Juan dela Cruz"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
                <div className="form-field full">
                  <label>Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Street, Barangay, City, Province"
                    value={form.delivery_address}
                    onChange={(e) => set("delivery_address", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div className="checkout-section-num">2</div>
              <h3>Payment Method</h3>
            </div>
            <div className="checkout-section-body">
              <p style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>
                Note: Final amount will be confirmed by admin after reviewing
                your custom order.
              </p>
              <div className="payment-methods">
                {PAYMENT_METHODS.map((m) => (
                  <div
                    key={m.value}
                    className={`payment-method-card ${form.payment_method === m.value ? "selected" : ""}`}
                    onClick={() => set("payment_method", m.value)}
                  >
                    <div className="payment-method-icon">{m.icon}</div>
                    <div className="payment-method-info">
                      <span className="payment-method-name">{m.label}</span>
                      <span className="payment-method-desc">{m.desc}</span>
                    </div>
                    <div className="payment-method-check" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div className="checkout-section-num">3</div>
              <h3>Additional Notes</h3>
            </div>
            <div className="checkout-section-body">
              <div className="form-field">
                <textarea
                  className="order-notes"
                  rows={3}
                  placeholder="Any other instructions or information for our team…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="checkout-summary">
          <div className="checkout-summary-header">
            <h3>Custom Order Summary</h3>
          </div>
          <div className="checkout-summary-items">
            {customCart.map((item) => (
              <div key={item.key} className="checkout-summary-item">
                <div>
                  <div className="checkout-summary-item-name">
                    {item.product_name}
                  </div>
                  <div className="checkout-summary-item-qty">
                    ×{item.quantity}
                  </div>
                </div>
                <div
                  className="checkout-summary-item-price"
                  style={{ color: "#aaa", fontSize: 11 }}
                >
                  TBD
                </div>
              </div>
            ))}
          </div>
          <div className="checkout-summary-totals">
            <div className="summary-row">
              <span>Total Price</span>
              <span style={{ color: "#D2691E", fontWeight: 700 }}>
                Quoted by Admin
              </span>
            </div>
            <p className="summary-note" style={{ marginTop: 10 }}>
              Our team will contact you with the final price before production
              begins.
            </p>
          </div>
          <button
            className="place-order-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              "Submitting…"
            ) : (
              <>
                <Scissors size={16} /> Submit Custom Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
