/**
 * pages/cartpage.jsx
 * Uses CartContext — cart state is shared across all pages
 * Checkbox selection: only checked items proceed to checkout
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "./cartcontext";
import "./cart.css";

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, updateQty, removeItem, clearCart } = useCart();

  /* ── Selected keys — all checked by default ── */
  const [selected, setSelected] = useState(new Set());

  /* Sync selected when cart changes — new items auto-checked, removed items dropped */
  useEffect(() => {
    setSelected((prev) => {
      const cartKeys = new Set(cart.map((i) => i.key));
      const next = new Set([...prev].filter((k) => cartKeys.has(k)));
      cart.forEach((i) => {
        if (!prev.has(i.key)) next.add(i.key);
      });
      return next;
    });
  }, [cart]);

  /* ── Checkbox handlers ── */
  const toggleItem = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allChecked = cart.length > 0 && selected.size === cart.length;
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(cart.map((i) => i.key)));
  };

  /* ── Computed totals from selected only ── */
  const selectedItems = cart.filter((i) => selected.has(i.key));
  const subtotal = selectedItems.reduce(
    (s, i) => s + i.unit_price * i.quantity,
    0,
  );
  const itemCount = selectedItems.reduce((s, i) => s + i.quantity, 0);

  /* ── Proceed: save selected keys, checkout will filter from full cart ── */
  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    sessionStorage.setItem("cust_selected_keys", JSON.stringify([...selected]));
    navigate("/checkout");
  };

  return (
    <div>
      <div className="page-hero">
        <h1>Shopping Cart</h1>
        <p>Review your items before proceeding to checkout</p>
      </div>

      {cart.length === 0 ? (
        <div className="cart-items-panel">
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Browse our catalog and add products to your cart.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/catalog")}
            >
              <ShoppingBag size={16} /> Browse Products
            </button>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          {/* ── Left: items ── */}
          <div className="cart-items-panel">
            <div className="cart-panel-header">
              <h2>
                <ShoppingCart
                  size={18}
                  style={{
                    display: "inline",
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                />
                Cart Items
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span>
                  {cart.length} item{cart.length !== 1 ? "s" : ""}
                </span>
                <button className="cart-clear-btn" onClick={clearCart}>
                  Clear all
                </button>
              </div>
            </div>
            {/* Select All row — below header */}
            <div className="cart-select-all-row">
              <label className="cart-select-all-label">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                />
                <span>Select All</span>
              </label>
            </div>

            {cart.map((item) => {
              const isChecked = selected.has(item.key);
              return (
                <div
                  key={item.key}
                  className={`cart-item-row ${isChecked ? "cart-item-selected" : "cart-item-dimmed"}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    className="cart-item-checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(item.key)}
                  />

                  {/* Image — grayscale only if out of stock */}
                  <div className="cart-item-img">
                    {item.image_url ? (
                      <img
                        src={`http://localhost:5000/${item.image_url}`}
                        alt={item.product_name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 8,
                          filter:
                            item.stock_status === "out_of_stock"
                              ? "grayscale(100%)"
                              : "none",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                    ) : null}
                    <span
                      style={{ display: item.image_url ? "none" : "block" }}
                    >
                      {item.item_type === "blueprint" ? "📐" : "🪵"}
                    </span>
                  </div>

                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product_name}</div>
                    {item.wood_type && (
                      <div className="cart-item-meta">{item.wood_type}</div>
                    )}
                    {item.item_type === "blueprint" && (
                      <div
                        className="cart-item-meta"
                        style={{ color: "#8B4513" }}
                      >
                        📐 Blueprint Order
                      </div>
                    )}
                    <div className="cart-item-unit-price">
                      {parseFloat(item.unit_price) > 0
                        ? `₱${parseFloat(item.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} each`
                        : "Price to be quoted"}
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div className="cart-item-controls">
                    <button
                      className="cart-qty-btn"
                      onClick={() => updateQty(item.key, -1)}
                    >
                      <Minus size={13} />
                    </button>
                    <span className="cart-qty-val">{item.quantity}</span>
                    <button
                      className="cart-qty-btn"
                      onClick={() => updateQty(item.key, 1)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="cart-item-subtotal">
                    {parseFloat(item.unit_price) > 0 ? (
                      `₱${(item.unit_price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                    ) : (
                      <span style={{ fontSize: 12, color: "#aaa" }}>TBD</span>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    className="cart-item-remove"
                    onClick={() => removeItem(item.key)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}

            {/* Partial selection footer */}
            {selected.size > 0 && selected.size < cart.length && (
              <div className="cart-selection-bar">
                {selected.size} of {cart.length} item
                {cart.length !== 1 ? "s" : ""} selected for checkout
              </div>
            )}
          </div>

          {/* ── Right: summary ── */}
          <div className="order-summary-panel">
            <div className="summary-header">
              <h2>Order Summary</h2>
            </div>
            <div className="summary-body">
              <div className="summary-row">
                <span>
                  Selected ({itemCount} item{itemCount !== 1 ? "s" : ""})
                </span>
                <span>
                  ₱
                  {subtotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                  Calculated at checkout
                </span>
              </div>

              <hr className="summary-divider" />

              <div className="summary-total">
                <span>Total</span>
                <span>
                  ₱
                  {subtotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <p className="summary-note">
                Final total including any delivery fees will be confirmed at
                checkout.
              </p>

              {selected.size === 0 && (
                <p className="cart-no-selection-note">
                  ☝️ Select at least one item to proceed
                </p>
              )}

              <button
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={selected.size === 0}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>
              <button
                className="continue-shopping"
                onClick={() => navigate("/catalog")}
              >
                ← Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
