import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Receipt, Plus, Minus, Trash2 } from "lucide-react"; // Added new icons

export default function ProcessOrder() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    payment_method: "cash",
    discount: 0,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("pos_cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  // --- NEW CART MANAGEMENT FUNCTIONS (Rule #4) ---
  const updateCartSession = (newCart) => {
    setCart(newCart);
    sessionStorage.setItem("pos_cart", JSON.stringify(newCart));
  };

  const handleIncreaseQty = (key) => {
    const newCart = cart.map((item) =>
      item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
    );
    updateCartSession(newCart);
  };

  const handleDecreaseQty = (key) => {
    const newCart = cart.map((item) =>
      item.key === key && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item,
    );
    updateCartSession(newCart);
  };

  const handleRemoveItem = (key) => {
    const newCart = cart.filter((item) => item.key !== key);
    updateCartSession(newCart);
  };
  // -----------------------------------------------

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = parseFloat(form.discount) || 0;
  const total = subtotal - discount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return setError("Cart is empty.");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/pos/orders", {
        ...form,
        items: cart,
        discount,
      });
      sessionStorage.removeItem("pos_cart");
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process order.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 460,
            width: "100%",
            textAlign: "center",
            padding: 40,
          }}
        >
          <CheckCircle size={56} color="#2e7d32" style={{ marginBottom: 16 }} />
          <h2 style={{ color: "#1a1a2e", marginBottom: 8 }}>
            Order Successful!
          </h2>
          <p style={{ color: "#666", marginBottom: 6 }}>
            Order #: <strong>{success.order_number}</strong>
          </p>
          <p style={{ color: "#666", marginBottom: 6 }}>
            Receipt #: <strong>{success.receipt_number}</strong>
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#8B4513",
              marginBottom: 24,
            }}
          >
            ₱
            {parseFloat(success.total).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/receipt/${success.receipt_id}`)}
            >
              <Receipt size={16} /> View Receipt
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSuccess(null);
                setCart([]);
                navigate("/products");
              }}
            >
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Process Order & Payment</h1>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#aaa" }}>
            No items in cart.{" "}
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/products")}
              style={{ marginLeft: 10 }}
            >
              Go to Product Search
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Process Order & Payment</h1>
        <p>Review cart and complete payment for walk-in customer</p>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}
      >
        {/* Order Form */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontWeight: 700 }}>
            Customer & Payment Details
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Customer Name</label>
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label>Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm({ ...form, payment_method: e.target.value })
                  }
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="cop">Cash on Pick-up (COP)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Discount (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) =>
                    setForm({ ...form, discount: e.target.value })
                  }
                />
              </div>
              <div className="form-field full">
                <label>Notes / Special Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Any special notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "#fce4ec",
                  color: "#c62828",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginTop: 16,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/products")}
              >
                ← Back to Cart
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : "✓ Confirm Order & Process Payment"}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="card" style={{ height: "fit-content" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontWeight: 700, margin: 0 }}>Order Summary</h3>
            <span className="badge badge-gray">{cart.length} item(s)</span>
          </div>

          <div
            style={{ maxHeight: 320, overflowY: "auto", paddingRight: "4px" }}
          >
            {cart.map((item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 0",
                  borderBottom: "1px solid #f0f0f0",
                  fontSize: 13,
                }}
              >
                {/* Top Row: Name & Total Price */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, flex: 1, paddingRight: 10 }}>
                    {item.product_name}
                  </div>
                  <div style={{ fontWeight: 700, color: "#1a1a2e" }}>
                    ₱
                    {(item.unit_price * item.quantity).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Bottom Row: Unit Price & Quantity Controls */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: "#888", fontSize: 12 }}>
                    @ ₱
                    {item.unit_price.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {/* - / + Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #e0e0e0",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleDecreaseQty(item.key)}
                        disabled={item.quantity <= 1}
                        style={{
                          padding: "4px 8px",
                          background: item.quantity <= 1 ? "#f9f9f9" : "white",
                          border: "none",
                          cursor:
                            item.quantity <= 1 ? "not-allowed" : "pointer",
                          color: item.quantity <= 1 ? "#ccc" : "#555",
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        style={{
                          padding: "0 10px",
                          fontWeight: 600,
                          fontSize: 13,
                          minWidth: "32px",
                          textAlign: "center",
                          borderLeft: "1px solid #e0e0e0",
                          borderRight: "1px solid #e0e0e0",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncreaseQty(item.key)}
                        style={{
                          padding: "4px 8px",
                          background: "white",
                          border: "none",
                          cursor: "pointer",
                          color: "#555",
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Trash Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.key)}
                      style={{
                        padding: "6px",
                        background: "#fce4ec",
                        color: "#c62828",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Remove Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              borderTop: "2px solid #f0f0f0",
              paddingTop: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#555" }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>
                ₱
                {subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 8,
                  color: "#c62828",
                }}
              >
                <span>Discount</span>
                <span style={{ fontWeight: 600 }}>
                  -₱
                  {discount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                fontWeight: 800,
                color: "#8B4513",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px dashed #e0e0e0",
              }}
            >
              <span>TOTAL</span>
              <span>
                ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
