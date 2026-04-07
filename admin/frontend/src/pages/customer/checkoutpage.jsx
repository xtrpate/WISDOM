/**
 * pages/checkoutpage.jsx
 * Full checkout: delivery info, payment method selection,
 * PayMongo redirect integration, order placement
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "./cartcontext";
import { CheckCircle } from "lucide-react";
import "./cart.css";
import useAuthStore from "../../store/authStore";

// 👉 UPDATED: Replaced manual GCash with a seamless PayMongo option
const PAYMENT_METHODS = [
  {
    value: "cod",
    label: "Cash on Delivery",
    desc: "Pay when your order arrives",
    icon: "💵",
    needsProof: false,
  },
  {
    value: "cop",
    label: "Cash on Pick-up",
    desc: "Pay when you pick up your order",
    icon: "🏪",
    needsProof: false,
  },
  {
    value: "paymongo",
    label: "Online Payment (PayMongo)",
    desc: "GCash, Maya, Credit/Debit Cards",
    icon: "💳",
    needsProof: false, // No screenshot needed, PayMongo verifies it automatically!
  },
  {
    value: "bank_transfer",
    label: "Manual Bank Transfer",
    desc: "Transfer to our bank account",
    icon: "🏦",
    needsProof: true,
  },
];

export default function CheckoutPage() {
  const { user } = useAuthStore();
  const { cart, removeItem, clearCart } = useCart();

  /* Read selected keys saved by CartPage — fall back to full cart */
  const selectedKeys = (() => {
    try {
      const saved = sessionStorage.getItem("cust_selected_keys");
      return saved ? new Set(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  })();
  const checkoutCart = selectedKeys
    ? cart.filter((i) => selectedKeys.has(i.key))
    : cart;
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    delivery_address: user?.address || "",
    payment_method: "",
    notes: "",
  });

  /* Redirect to cart if empty */
  useEffect(() => {
    if (!checkoutCart || checkoutCart.length === 0) navigate("/cart");
  }, []);

  /* Load payment settings */
  useEffect(() => {
    axios
      .get("/api/customer/settings")
      .then((r) => setSettings(r.data))
      .catch(() => {});
  }, []);

  /* Auto-redirect to /orders after success (For Offline Payments) */
  useEffect(() => {
    if (!success) return;
    if (redirectCountdown <= 0) {
      navigate("/orders");
      return;
    }
    const t = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, redirectCountdown, navigate]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const subtotal = checkoutCart.reduce(
    (s, i) => s + i.unit_price * i.quantity,
    0,
  );
  const itemCount = checkoutCart.reduce((s, i) => s + i.quantity, 0);

  const selectedMethod = PAYMENT_METHODS.find(
    (m) => m.value === form.payment_method,
  );
  const needsProof = selectedMethod?.needsProof ?? false;

  /* Handle file selection */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* Place order */
  const handlePlaceOrder = async () => {
    setError("");

    if (!form.name.trim()) return setError("Please enter your name.");
    if (!form.phone.trim()) return setError("Please enter your phone number.");
    if (!form.delivery_address.trim() && form.payment_method !== "cop")
      return setError("Please enter your delivery address.");
    if (!form.payment_method)
      return setError("Please select a payment method.");
    if (needsProof && !proofFile)
      return setError("Please upload your proof of payment.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(checkoutCart));
      formData.append("name", form.name);
      formData.append("phone", form.phone);
      formData.append("delivery_address", form.delivery_address);
      formData.append("payment_method", form.payment_method);
      formData.append("notes", form.notes);
      formData.append("subtotal", subtotal.toString());
      formData.append("total", subtotal.toString());
      if (proofFile) formData.append("proof", proofFile);

      const res = await axios.post("/api/customer/orders", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      /* Remove only checked-out items, leave rest in cart */
      if (selectedKeys) {
        checkoutCart.forEach((item) => removeItem(item.key));
        sessionStorage.removeItem("cust_selected_keys");
      } else {
        clearCart();
      }

      // 👉 UPDATED: PayMongo Redirect Logic
      // If the backend returns a PayMongo URL, redirect the user immediately!
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
        return; // Stop execution here so we don't show the success screen yet
      }

      // If it's COD, COP, or Manual Bank Transfer, show standard success screen
      setSuccess(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to place order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <div>
        <div className="page-hero">
          <h1>Order Placed! 🎉</h1>
        </div>
        <div className="order-success">
          <div className="order-success-icon">✅</div>
          <h2>Thank You, {user?.name?.split(" ")[0]}!</h2>
          <p>Your order has been successfully placed.</p>
          <p>You'll receive updates as your order is processed.</p>

          <div className="order-success-details">
            <div className="order-success-detail-row">
              <span>Order Number</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                {success.order_number}
              </span>
            </div>
            <div className="order-success-detail-row">
              <span>Payment Method</span>
              <span style={{ textTransform: "capitalize" }}>
                {form.payment_method.replace("_", " ")}
              </span>
            </div>
            <div className="order-success-detail-row">
              <span>Total Amount</span>
              <span>
                ₱
                {parseFloat(success.total).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="order-success-detail-row">
              <span>Payment Status</span>
              <span style={{ color: needsProof ? "#f57f17" : "#2e7d32" }}>
                {needsProof
                  ? "Pending Verification"
                  : "Pay on " +
                    (form.payment_method === "cod" ? "Delivery" : "Pick-up")}
              </span>
            </div>
          </div>

          {needsProof && (
            <div className="alert alert-info">
              Your payment proof has been submitted and is pending admin
              verification. We'll notify you once it's confirmed.
            </div>
          )}

          <p style={{ color: "#999", fontSize: 13, marginBottom: 16 }}>
            Redirecting to My Orders in <strong>{redirectCountdown}s</strong>…
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/orders")}
            >
              View My Orders
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/catalog")}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Checkout form ── */
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
          <h1>Checkout</h1>
          <p>Complete your order details below</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate("/cart")}>
          ← Back to Cart
        </button>
      </div>

      <div className="checkout-layout">
        {/* ── Left: form ── */}
        <div className="checkout-form-panel">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Section 0: Order Items Review */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div
                className="checkout-section-num"
                style={{
                  background: "linear-gradient(135deg,#1a1a2e,#2d1b0e)",
                }}
              >
                📦
              </div>
              <h3>Items to Order</h3>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>
                {checkoutCart.length} item{checkoutCart.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="checkout-items-preview">
              {checkoutCart.map((item) => (
                <div key={item.key} className="checkout-item-row">
                  {/* Image */}
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
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        display: item.image_url ? "none" : "flex",
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                      }}
                    >
                      {item.item_type === "blueprint" ? "📐" : "🪵"}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="checkout-item-details">
                    <div className="checkout-item-name">
                      {item.product_name}
                    </div>
                    {item.wood_type && (
                      <div className="checkout-item-sub">{item.wood_type}</div>
                    )}
                    {item.item_type === "blueprint" && (
                      <div
                        className="checkout-item-sub"
                        style={{ color: "#8B4513" }}
                      >
                        📐 Blueprint Order
                      </div>
                    )}
                    <div className="checkout-item-sub">
                      {parseFloat(item.unit_price) > 0
                        ? `₱${parseFloat(item.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} each`
                        : "Price to be quoted"}
                    </div>
                  </div>
                  {/* Qty */}
                  <div className="checkout-item-qty">×{item.quantity}</div>
                  {/* Subtotal */}
                  <div className="checkout-item-price">
                    {parseFloat(item.unit_price) > 0 ? (
                      `₱${(item.unit_price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                    ) : (
                      <span style={{ fontSize: 12, color: "#aaa" }}>TBD</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: Delivery Info */}
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
                  <label>
                    Delivery Address{" "}
                    {form.payment_method === "cop"
                      ? "(optional for pick-up)"
                      : "*"}
                  </label>
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

          {/* Section 2: Payment Method */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div className="checkout-section-num">2</div>
              <h3>Payment Method</h3>
            </div>
            <div className="checkout-section-body">
              <div className="payment-methods">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.value}
                    className={`payment-method-card ${form.payment_method === method.value ? "selected" : ""}`}
                    onClick={() => set("payment_method", method.value)}
                  >
                    <div className="payment-method-icon">{method.icon}</div>
                    <div className="payment-method-info">
                      <span className="payment-method-name">
                        {method.label}
                      </span>
                      <span className="payment-method-desc">{method.desc}</span>
                    </div>
                    <div className="payment-method-check" />
                  </div>
                ))}
              </div>

              {/* 👉 UPDATED: PayMongo UI Explainer */}
              {form.payment_method === "paymongo" && (
                <div className="payment-info-box">
                  <h4>💳 Secure Online Payment</h4>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#555",
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    After clicking "Place Order", you will be securely
                    redirected to PayMongo to complete your payment. You can use
                    GCash, Maya, or any Credit/Debit Card.
                  </p>
                </div>
              )}

              {form.payment_method === "bank_transfer" && (
                <div className="payment-info-box">
                  <h4>🏦 Bank Transfer Details</h4>
                  <div className="payment-info-row">
                    <span>Bank Account Name</span>
                    <span>{settings.bank_account_name || "Contact admin"}</span>
                  </div>
                  <div className="payment-info-row">
                    <span>Account Number</span>
                    <span>
                      {settings.bank_account_number || "Contact admin"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                    Please transfer the exact amount and upload your receipt
                    below.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Proof of Payment (Hides dynamically for PayMongo) */}
          {needsProof && (
            <div className="checkout-section">
              <div className="checkout-section-header">
                <div className="checkout-section-num">3</div>
                <h3>Upload Proof of Payment</h3>
              </div>
              <div className="checkout-section-body">
                <div
                  className={`upload-area ${proofFile ? "has-file" : ""}`}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {proofFile ? (
                    <>
                      {proofPreview &&
                        proofPreview.startsWith("data:image") && (
                          <img
                            src={proofPreview}
                            alt="proof"
                            style={{
                              maxHeight: 120,
                              borderRadius: 8,
                              marginBottom: 8,
                            }}
                          />
                        )}
                      <div className="upload-filename">✓ {proofFile.name}</div>
                      <div className="upload-hint">Click to change file</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">📎</div>
                      <div className="upload-text">
                        Click to upload payment screenshot
                      </div>
                      <div className="upload-hint">
                        JPG, PNG or PDF • Max 5MB
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Order Notes */}
          <div className="checkout-section">
            <div className="checkout-section-header">
              <div className="checkout-section-num">{needsProof ? 4 : 3}</div>
              <h3>
                Order Notes{" "}
                <span style={{ fontWeight: 400, color: "#aaa", fontSize: 13 }}>
                  (optional)
                </span>
              </h3>
            </div>
            <div className="checkout-section-body">
              <div className="form-field">
                <textarea
                  rows={3}
                  placeholder="Any special instructions or notes for your order..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: summary ── */}
        <div className="checkout-summary">
          <div className="checkout-summary-header">
            <h3>Order Summary ({itemCount} items)</h3>
          </div>

          <div className="checkout-summary-items">
            {checkoutCart.map((item) => (
              <div key={item.key} className="checkout-summary-item">
                <div>
                  <div className="checkout-summary-item-name">
                    {item.product_name}
                  </div>
                  <div className="checkout-summary-item-qty">
                    ×{item.quantity}
                  </div>
                </div>
                <div className="checkout-summary-item-price">
                  ₱
                  {(item.unit_price * item.quantity).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="checkout-summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>
                ₱
                {subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>₱0.00</span>
            </div>
            <hr className="summary-divider" />
            <div className="summary-total">
              <span>Total</span>
              <span>
                ₱
                {subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {needsProof && (
              <p
                style={{
                  fontSize: 12,
                  color: "#f57f17",
                  marginTop: 8,
                  fontWeight: 600,
                }}
              >
                ⚠ Payment pending admin verification
              </p>
            )}
          </div>

          <button
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={loading || !form.payment_method}
          >
            <CheckCircle size={16} />
            {loading
              ? "Processing..."
              : form.payment_method === "paymongo"
                ? "Proceed to PayMongo"
                : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
